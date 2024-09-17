import { Command } from "commander";
import { scanCommandHandler, type ScanCommandParams } from "./commands/scan";
import { loginCommandHandler } from "./commands/login";
import { setTokenCommandHandler } from "./commands/set-token";
import { listRulesetsCommandHandler } from "./commands/list-rulesets";

export async function initCli() {

    const program = new Command("pensar");
    
    program.command("scan [target]")
    .description("Scan for vulnerabilties starting in a target location. This command will recursively scan files starting from the target location.")
    .option("-lang, --language <language>", "Target a specific language/filetype")
    .option("--local", "Run local LLM inference")
    .option("--api-key <api_key>", "Specify Pensar key. This will default to `proccess.env.PENSAR_API_KEY`")
    .option("--api-key-name <api_key_name>", "Specify the name of the API key you wish to use.")
    .option("--github", "Specify if the CLI is being run in a github action. This will use generated fixes to create PRs instead of presenting the user the ability to locally apply patches.")
    .option("--rulesets <rulesets...>", "Specify rulesets to scan against. Run `pensar list-rules` to view a full list of rulesets.")
    .option("--verbose", "Verbosity flag")
    .option("--no-logging", "Whether to prevent scan results from being logged to the Pensar console. Default false.", false)
    .option("--no-tel", "Whether to turn off telemetry. Default false.", false)
    .action(async (target, options, command) => {
        const params: ScanCommandParams = {
            target: target,
            language: options.language,
            github: options.github,
            local: options.local,
            ruleSets: options.rulesets,
            api_key: options.apiKey,
            api_key_name: options.apiKeyName,
            verbose: options.verbose,
            no_logging: options.noLogging,
            no_tel: options.noTel
        };
        await scanCommandHandler(params);
    });

    program.command("login")
    .description("Opens a browser window at https://console.pensar.dev/login.")
    .option("--no-browser", "Will not automatically open a browser window.", false)
    .action((options, command) => {
        loginCommandHandler(options.noBrowser);
    });

    program.command("set-token [value]")
    .description("Set the Pensar API key. Optionally pass in --name to set the key under a name (useful if using multiple workspaces or API keys).")
    .option("--name <name>", "Optional name to assign to the API key.")
    .action((value, options, command) => {
        setTokenCommandHandler({
            value: value,
            name: options.name
        })
    });

    program.command("list-rulesets")
    .description("List available rulesets. ")
    .action(() => {
        listRulesetsCommandHandler();
    })

    await program.parseAsync(process.argv);
}