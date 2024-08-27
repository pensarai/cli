import scan, { type Issue, type Language, type SemgrepScanOptions } from "@pensar/semgrep-node";

// TODO: respect .gitignore --> semgrep-core may do this by default

async function runScan(target: string, options: SemgrepScanOptions) {
    const results = await scan(target, options);
    if(options.verbose) {
        console.debug(results);
    }

    return results
}

async function dispatchCodeGen(results: Issue[]) {
    // TODO: dispatch to server
}

export async function scanCommand(target: string, options: SemgrepScanOptions) {
    const results = await runScan(target, options);
    await dispatchCodeGen(results);
}
