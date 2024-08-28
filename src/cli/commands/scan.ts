import scan, { type Issue, type Language, type SemgrepScanOptions } from "@pensar/semgrep-node";
import { codeGenDiff, type CompletionClientOptions } from "../completions";
import { createPr } from "./github";
import type { Repository } from "../../lib/types";
import { spawnLlamaCppServer } from "../../server";
import { checkLocalConfig, getFileContents } from "../utils";
import { displayDiffs } from "./apply-patch";
import ora from "ora";

// TODO: respect .gitignore --> semgrep-core may do this by default

async function runScan(target: string, options: SemgrepScanOptions) {
    const results = await scan(target, options);
    if(options.verbose) {
        console.debug(results);
    }
    return results
}

async function dispatchCodeGen(issue: Issue, completionClientOptions: CompletionClientOptions) {
    const contents = await getFileContents(issue.location);
    const diff = await codeGenDiff(contents, issue, completionClientOptions);
    return { diff, issue }
}

async function dispatchPrCreation(issue: Issue, diff: string, repository: Repository, completionClientOptions: CompletionClientOptions) {
    const contents = await getFileContents(issue.location);
    await createPr(contents, issue, diff, repository, completionClientOptions);
}

async function _scan(target: string, options: SemgrepScanOptions, completionClientOptions: CompletionClientOptions) {
    const issues = await runScan(target, options);
    if(issues.length === 0) {
        return
    }
    try {
        if(completionClientOptions.local) {
            const proc = await spawnLlamaCppServer();
        }
        const diffs = await Promise.all(
            issues.map(issue => dispatchCodeGen(issue, completionClientOptions))
        );
        return diffs
    } catch(error) {
        throw new Error(`There was an error starting the language model server: ${error}`);
    }
    // TODO: otherwise enable user to flip thru "patches" and apply
}

export interface ScanCommandParams {
    target?: string;
    github?: boolean;
    language?: Language;
    verbose?: boolean;
    ruleSets?: string[];
    local?: boolean;
    api_key?: string;
}

export async function scanCommandHandler(params: ScanCommandParams) {
    // TODO: respect .gitignore when scanning --> @pensar/semgrep
    // TODO: implement // @pensar-ok tags
    if(params.local) {
        await checkLocalConfig();
    }
    
    const target = params.target??process.cwd(); // TODO: should be cwd

    // let spinner = ora({
    //     text: `\tRunning scan in ${target}...`,
    //     stream: process.stdout,
    //     discardStdin: true
    // }).start();

    console.log(`Running scan on ${target}`);

    const diffs = await _scan(target, {
        verbose: params.verbose,
        language: params.language??"ts", // TODO: auto-detect or pass some sane default (pass multiple?)
        ruleSets: params.ruleSets
    }, { local: params.local, oaiApiKey: params.api_key });
    
    if(!diffs) {
        console.log("Nice. No issues found.");
        // spinner = spinner.succeed("\tNice. No issues found.");
        return
    }
    // spinner.stop();

    if(params.github) {
        let token = process.env.GITHUB_TOKEN;
        if(!token) {
            throw new Error("`--github` is meant to be run in context of a github action runner. `GITHUB_TOKEN` env variable was not found.");
        }
        let repo = process.env.GITHUB_REPOSITORY;
        if(!repo) {
            throw new Error("`--github` is meant to be run in context of a github action runner. `GITHUB_REPOSITORY` env variable was not found.");
        }
        let [owner, name] = repo.split("/");
        console.log("--- Creating Github PRs ---");
        await Promise.all(
            diffs.map(d => dispatchPrCreation(d.issue, d.diff, { owner, name }, { local: params.local, oaiApiKey: params.api_key }))
        );
        console.log(`Successfully created ${diffs.length} PRs`);
    } else {
        displayDiffs(diffs);
    }
}