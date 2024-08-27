import { Command } from "commander";
import { scanCommandHandler } from "./commands/scan";

async function main() {

    const program = new Command();
    
    program.command("scan [target]")
    .description("Scan for vulnerabilties starting in a target location. This command will recursively scan files starting from the target location.")
    .option("-lang, --language <language>", "Target a specific language/filetype")
    .option("--github", "Specify if the CLI is being run in a github action. This will use generated fixes to create PRs instead of presenting the user the ability to locally apply patches.")
    .action(scanCommandHandler);

    await program.parseAsync(process.argv);
}

main();