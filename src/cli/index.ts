import { Command } from "commander";
import { scanCommandHandler, type ScanCommandParams } from "./commands/scan";
import { renderMainView } from "./views/out";
import type { Diff } from "./commands/apply-patch";

export async function initCli() {

    const program = new Command("pensar");
    
    program.command("scan [target]")
    .description("Scan for vulnerabilties starting in a target location. This command will recursively scan files starting from the target location.")
    .requiredOption("-lang, --language <language>", "Target a specific language/filetype")
    .option("--local", "Run local LLM inference")
    .option("--api_key <api_key>", "Specify Pensar key. This will default to `proccess.env.PENSAR_API_KEY`")
    .option("--github", "Specify if the CLI is being run in a github action. This will use generated fixes to create PRs instead of presenting the user the ability to locally apply patches.")
    .option("--rulesets <rulesets...>", "Specify rulesets to scan against. Run `pensar list-rules` to view a full list of rulesets.")
    .option("--verbose", "Verbosity flag")
    .option("--no_metrics", "Whether to prevent scan results from being logged to the Pensar console. Default false.", false)
    .action(async (target, options, command) => {
        const params: ScanCommandParams = {
            target: target,
            github: options.github,
            local: options.local,
            ruleSets: options.rulesets,
            api_key: options.api_key,
            verbose: options.verbose,
            no_metrics: options.no_metrics
        };
        await scanCommandHandler(params);
    });

    program.command("text")
    .action(() => {
        let diffs: Diff[] = [
            {
                diff: "TESTING",
                issue: {
                    uid: "tetetet",
                    location: "",
                    startLineNumber: 10,
                    endLineNumber: 11,
                    scanId: "sadadasd",
                    message: "TEST MESSAGE",
                    severity: "high",
                    issueId: "test-issue-1"
                }
            },
            {
                diff: "TESTING",
                issue: {
                    uid: "rrrrrr",
                    location: "",
                    startLineNumber: 10,
                    endLineNumber: 11,
                    scanId: "sadadasd",
                    message: "TEST MESSAGE",
                    severity: "high",
                    issueId: "test-issue-2"
                }
            },

        ];
        renderMainView(diffs);
    });

    // TODO: implement model weight and inference server binary downloading for use w/ `--local`
    // program.command("init-local")
    // .description("Download model weights and inference server binary for local Pensar usage.")
    // .action()

    // TODO: implement program.command("list-rules")

    await program.parseAsync(process.argv);
}