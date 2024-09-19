import scan, { type Language, type SemgrepScanOptions, type Issue } from "@pensar/semgrep-node";
import { codeGenDiff, type CompletionClientOptions } from "../../completions";
import { createPr, getGitRemoteOrigin } from "./github";
import type { IssueItem, Repository } from "../../../lib/types";
import { spawnLlamaCppServer } from "../../../server";
import { checkForInferenceServerBinary, checkForLocalModels, checkLocalConfig, getFileContents } from "../../utils";
import { displayDiffs } from "./apply-patch";
import { nanoid } from "nanoid";
import { logScanResultsToConsole, updateIssueCloseStatus } from "../../remote-logging";
import { renderScanLoader } from "../../views/out";
import { detectProgrammingLanguages } from "./utils";
import { readFromConfigFile } from "../set-token";
import { writeToLog } from "@/lib/logs";
import { confirm } from "@inquirer/prompts";
import { downloadModelWeights } from "@/server/download-model";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { downloadAndExtractLlamaCpp } from "@/server/download-server-bin";
import cliProgress from "cli-progress";
import colors from "ansi-colors";

// TODO: respect .gitignore when scanning

type ScanOptions = Omit<SemgrepScanOptions, "language"> & {
    language?: Language;
}

async function runScan(target: string, options: ScanOptions) {
    let results: Issue[] = [];
    
    if(options.language) {
        results = await scan(target, {
            ...options,
            language: options.language
        });
    } else {
        const detectedLanguages = Array.from(detectProgrammingLanguages(target));
        let _result = await Promise.all(
            detectedLanguages.filter((item): item is Language => !!item).map((lang) => scan(target, {
                ...options,
                language: lang
            }))
        )
        results = _result.flat();
    }
    
    if(options.verbose) {
        console.log(results);
    }
    return results
}

async function dispatchCodeGen(issue: IssueItem, completionClientOptions: CompletionClientOptions) {
    const contents = await getFileContents(issue.location);
    try {
        const diff = await codeGenDiff(contents, issue, completionClientOptions);
        return { diff, issue }
    } catch(error) {
        // console.log(`Error generating code diff for issue: ${JSON.stringify(issue, undefined, 2)}`)
        // throw error
        return { diff: undefined, issue }
    }
}

async function dispatchPrCreation(issue: IssueItem, diff: string, repository: Repository, completionClientOptions: CompletionClientOptions, noMetrics: boolean) {
    const contents = await getFileContents(issue.location);
    const prUrl = await createPr(contents, issue, diff, repository, completionClientOptions);
    if(!noMetrics) {
        try {
            await updateIssueCloseStatus(issue.scanId, issue.uid, {
                pullRequest: prUrl,
                apiKey: completionClientOptions.pensarApiKey??""
            });
        } catch(error) {
            console.error("Error updating issue status with PR url: ", error);
        }
    }
}

type GenerateDiffsParams = {
    issues: Issue[];
    scanId: string;
    completionClientOptions: CompletionClientOptions;
};

async function executePromisesWithProgress<T>(promises: Promise<T>[]): Promise<T[]> {
    const progressBar = new cliProgress.SingleBar({
        format: colors.greenBright('{bar}') + '| {percentage}% || {value}/{total} Fixes generated',
    }, cliProgress.Presets.rect);

    progressBar.start(promises.length, 0);
  
    let completed = 0;
  
    const wrappedPromises = promises.map(async (promise) => {
      const result = await promise;
      completed++;
      progressBar.update(completed);
      return result;
    });
  
    const results = await Promise.all(wrappedPromises);
  
    progressBar.stop();
    return results;
  }

async function _generateDiffs(params: GenerateDiffsParams) {
    let issues = params.issues;

    let diffs = await executePromisesWithProgress(
        issues.map((issue) => dispatchCodeGen({
            ...issue,
            scanId: params.scanId,
            uid: nanoid(6)
        }, params.completionClientOptions))
    );

    return diffs
}

async function generateFixes(issues: Issue[], completionClientOptions: CompletionClientOptions) {
    const id = nanoid(6);
    
    if(completionClientOptions.local) {
        let proc: ChildProcessWithoutNullStreams | undefined = undefined;
        
        try {
            proc = await spawnLlamaCppServer();
        } catch(error) {
            console.error("There was an error starting the language model server.");
            process.exit(1);
        }

        const diffs = await _generateDiffs({
            issues: issues,
            scanId: id,
            completionClientOptions: completionClientOptions
        });

        if(proc) {
            proc.kill(0);
        }

        return { diffs, id }
    }

    try {

        const diffs = await _generateDiffs({
            issues: issues,
            scanId: id,
            completionClientOptions: completionClientOptions
        });

        return { diffs, id }

    } catch(error) {
        console.error(error);
        process.exit(1);
    }
}


async function _scan(target: string, options: ScanOptions) {
    const issues = await runScan(target, options);
    if(issues.length === 0) {
        return
    }
    return issues;
}

export interface ScanCommandParams {
    target?: string;
    github?: boolean;
    language?: Language;
    verbose?: boolean;
    ruleSets?: string[];
    local?: boolean;
    api_key?: string;
    api_key_name?: string;
    no_logging: boolean;
    no_tel: boolean;
}

export async function scanCommandHandler(params: ScanCommandParams) {
    const startTime = Date.now();

    if(params.local) {
        // TODO: handle local mode in github actions (model should be included in image)
        try {
            let modelsExist = await checkForLocalModels();
            if(!modelsExist) {
                console.log("Model weights not found in ~/.pensar/models. Pensar must download models weights when running in local mode.");
                const answer = await confirm({
                    message: "Would you like to download model weights?"
                });
                if(answer === true) {
                    await downloadModelWeights("https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q6_K.gguf", "meta-llama-3.1-8b-instruct-Q6_K.gguf");
                } else {
                    process.exit(0);
                }
            }
            let serverExists = await checkForInferenceServerBinary();
            if(!serverExists) {
                console.log("Downloading inference server binary.");
                await downloadAndExtractLlamaCpp();
            }
        } catch(e) {
            console.error(e);
            process.exit(1);
        }
    }

    let apiKey: string | undefined = params.api_key ?? process.env.PENSAR_API_KEY;

    if(!apiKey) {
        apiKey = readFromConfigFile(params.api_key_name)??undefined;
    }

    if(!apiKey && !params.no_logging) {
        throw new Error("API key is required when logging metrics to the Pensar console. Pass in `--no-logging` if you do not wish to log scan results to the Pensar console.");
    }

    const target = params.target??process.cwd();

    let clearLoader = renderScanLoader();

    const scanResult = await _scan(target, {
        verbose: params.verbose,
        language: params.language,
        ruleSets: params.ruleSets
    });
    
    if(!scanResult) {
        clearLoader.unmount();
        console.log("Nice. No issues found.");
        return;
    }

    clearLoader.unmount();

    console.log(`\nFound ${scanResult.length} vunlnerabilities.`);
    console.log("\n");

    const { diffs, id } = await generateFixes(scanResult, { local: params.local, pensarApiKey: apiKey });

    const endTime = Date.now();
    
    if(!params.no_logging) {
        try {
            let repo = await getGitRemoteOrigin(target);
            await logScanResultsToConsole(diffs[0].issue.scanId, diffs.map(d => d.issue), {
                repository: { name: repo.name, owner: repo.owner }, startTime, endTime, apiKey: apiKey as string
            });
        } catch (error) {
            console.error(`Error logging scan to Pensar console: `, error);
        }
    }

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
        if(!params.no_logging) {
            try {
                await logScanResultsToConsole(diffs[0].issue.scanId, diffs.map(d => d.issue), {
                    repository: { name: name, owner: owner }, startTime, endTime, apiKey: apiKey as string
                });
            } catch(error) {
                console.error("Error logging scan results to Pensar console: ", error);
            }
        }
        console.log("--- Creating Github PRs ---");
        await Promise.all(
            // TODO: log when an autofix was not able to be generated due to inference api errors
            diffs.filter(d => d.diff !== undefined).map(d => dispatchPrCreation(d.issue, d.diff, { owner, name }, { local: params.local, pensarApiKey: apiKey }, params.no_logging))
        );
        console.log(`Successfully created ${diffs.length} PRs`);
    } else {
        displayDiffs({
            diffs: diffs,
            scanId: id,
            noLogging: params.no_logging,
            apiKey: apiKey
        });
    }
}