import type { Issue } from "@pensar/semgrep-node";
import chalk  from "chalk";
import readline from "readline";


function formatDiff(diffText: string) {
    diffText = diffText.replace("<diff>","").replace("</diff>", "");
    const lines = diffText.split('\n');
    return lines.map(line => {
      if (line.startsWith('<')) {
        return chalk.red(line);
      } else if (line.startsWith('>')) {
        return chalk.green(line);
      } else {
        return line;
      }
    }).join('\n');
}

function displayCurrentDiff(diff: { diff: string, issue: Issue }) {
    console.clear();
    console.log(chalk.bgWhite.black(`Issue: ${diff.issue.issueId}`));
    console.log(formatDiff(diff.diff));
    console.log("\n(Use arrow keys to navigate, 'a' to apply, 'x' to iqnore, and 'q' to exit)");
}

export function displayDiffs(diffs: { diff: string, issue: Issue }[]) {
    let currentDiff = 0;

    
    readline.emitKeypressEvents(process.stdin);
    if(process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }
    displayCurrentDiff(diffs[0]);

    process.stdin.on('keypress', (str, key) => {
        if(key.name === "q") {
            process.exit();
        } else if (key.name === "right" && currentDiff < diffs.length - 1) {
            currentDiff++;
            displayCurrentDiff(diffs[currentDiff]);
        } else if (key.name === "left" && currentDiff > 0) {
            currentDiff--;
            displayCurrentDiff(diffs[currentDiff]);
        } else if (key.name === "a") {
            console.log(chalk.green("\nDiff applied!"));
            // TODO: apply diff
        } else if (key.name === "x") {
            console.log("\nIgnoring issue");
        }
    });
}