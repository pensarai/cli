import scan, { type Issue, type Language, type SemgrepScanOptions } from "@pensar/semgrep-node";
import { codeGenDiff } from "../completions";
import { createPr } from "./github";
import type { Repository } from "../../lib/types";
import { spawnLlamaCppServer } from "../../server";
import { getFileContents } from "../utils";

// TODO: respect .gitignore --> semgrep-core may do this by default

async function runScan(target: string, options: SemgrepScanOptions) {
    const results = await scan(target, options);
    if(options.verbose) {
        console.debug(results);
    }

    return results
}

async function dispatchCodeGen(issue: Issue) {
    const contents = await getFileContents(issue.location);
    const diff = await codeGenDiff(contents, issue);
    return { diff, issue }
}

async function dispatchPrCreation(issue: Issue, diff: string, repository: Repository) {
    const contents = await getFileContents(issue.location);
    await createPr(contents, issue, diff, repository);
}

async function _scan(target: string, options: SemgrepScanOptions) {
    const issues = await runScan(target, options);
    try {
        const proc = await spawnLlamaCppServer();
        const diffs = await Promise.all(
            issues.map(issue => dispatchCodeGen(issue))
        );
        proc.kill("SIGKILL");
        return diffs
    } catch(error) {
        throw new Error(`There was an error starting the language model server: ${error}`);
    }
    // TODO: otherwise enable user to flip thru "patches" and apply
}

interface ScanCommandParams {
    target?: string;
    github?: boolean;
    language?: Language;
    verbose?: boolean;
    ruleSets?: string[];
}

export async function scanCommandHandler(params: ScanCommandParams) {
    const target = params.target??"."; // TODO: should be cwd
    
    const diffs = await _scan(target, {
        verbose: params.verbose,
        language: params.language??"ts", // TODO: auto-detect or pass some sane default (pass multiple?)
        ruleSets: params.ruleSets
    });

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
            diffs.map(d => dispatchPrCreation(d.issue, d.diff, { owner, name }))
        );
        console.log(`Successfully created ${diffs.length} PRs`);
    }

    // TODO: present `apply-patch` UX
}