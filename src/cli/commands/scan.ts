import scan, { type Issue, type Language, type SemgrepScanOptions } from "@pensar/semgrep-node";
import { codeGenDiff, type CompletionClientOptions } from "../completions";
import { createPr } from "./github";
import type { IssueItem, Repository } from "../../lib/types";
import { spawnLlamaCppServer } from "../../server";
import { checkLocalConfig, getFileContents } from "../utils";
import { displayDiffs } from "./apply-patch";
import ora from "ora";
import { nanoid } from "nanoid";
import { logScanResultsToConsole, updateIssueCloseStatus } from "../metrics";

// TODO: respect .gitignore --> semgrep-core may do this by default (Update: it does not - atleast seems not to)

async function runScan(target: string, options: SemgrepScanOptions) {
    const results = await scan(target, options);
    if(options.verbose) {
        console.debug(results);
    }
    return results
}

async function dispatchCodeGen(issue: IssueItem, completionClientOptions: CompletionClientOptions) {
    const contents = await getFileContents(issue.location);
    const diff = await codeGenDiff(contents, issue, completionClientOptions);
    return { diff, issue }
}

async function dispatchPrCreation(issue: IssueItem, diff: string, repository: Repository, completionClientOptions: CompletionClientOptions, noMetrics: boolean) {
    const contents = await getFileContents(issue.location);
    const prUrl = await createPr(contents, issue, diff, repository, completionClientOptions);
    if(!noMetrics) {
        try {
            await updateIssueCloseStatus(issue.scanId, issue.uid, {
                pullRequest: prUrl,
                apiKey: completionClientOptions.oaiApiKey??""
            });
        } catch(error) {
            console.error("Error updating issue status with PR url: ", error);
        }
    }
}

async function _scan(target: string, options: SemgrepScanOptions, completionClientOptions: CompletionClientOptions) {
    const id = nanoid(6);
    
    const issues = await runScan(target, options);
    if(issues.length === 0) {
        return
    }
    try {
        if(completionClientOptions.local) {
            const proc = await spawnLlamaCppServer();
        }
        const diffs = await Promise.all(
            issues.map(issue => dispatchCodeGen({ ...issue, uid: nanoid(6), scanId: id }, completionClientOptions))
        );
        return diffs
    } catch(error) {
        throw new Error(`There was an error starting the language model server: ${error}`);
    }
}

export interface ScanCommandParams {
    target?: string;
    github?: boolean;
    language?: Language;
    verbose?: boolean;
    ruleSets?: string[];
    local?: boolean;
    api_key?: string;
    no_metrics: boolean;
}

export async function scanCommandHandler(params: ScanCommandParams) {
    // TODO: respect .gitignore when scanning --> @pensar/semgrep
    // TODO: implement // @pensar-ok tag support

    const startTime = Date.now();

    if(params.local) {
        await checkLocalConfig();
    }

    if(!params.api_key && !params.no_metrics) {
        throw new Error("API key is required when logging metrics to the Pensar console. Pass in `--no-metrics` if you do not wish to log to the Pensar console.");
    }
    
    const target = params.target??process.cwd();

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
        return;
    }
    // spinner.stop();
    const endTime = Date.now();

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
        if(!params.no_metrics) {
            try {
                await logScanResultsToConsole(diffs[0].issue.scanId, diffs.map(d => d.issue), {
                    repository: { name: name, owner: owner }, startTime, endTime, apiKey: params.api_key as string
                });
            } catch(error) {
                console.error("Error logging scan results to Pensar console: ", error);
            }
        }
        console.log("--- Creating Github PRs ---");
        await Promise.all(
            diffs.map(d => dispatchPrCreation(d.issue, d.diff, { owner, name }, { local: params.local, oaiApiKey: params.api_key }, params.no_metrics))
        );
        console.log(`Successfully created ${diffs.length} PRs`);
    } else {
        displayDiffs(diffs);
    }
}