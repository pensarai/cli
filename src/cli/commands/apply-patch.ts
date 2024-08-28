import type { Issue } from "@pensar/semgrep-node";
import chalk  from "chalk";
import readline from "readline";
import fs from "fs/promises";
import path from "path";
import { applyDiffs } from "../utils";

type Diff = {
    diff: string;
    issue: Issue;
    status?: "applied" | "ignored";
};

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

function displayCurrentDiff(diff: Diff) {
    console.clear();
    console.log(`${chalk.bgWhite.black(`Issue: ${diff.issue.issueId}`)} ${diff.status ? (diff.status === "applied" ? chalk.green.bold(diff.status): chalk.yellow.bold(diff.status)): ""}`);
    console.log(formatDiff(diff.diff));
    console.log("\n(Use <- -> arrow keys to navigate, 'a' to apply, 'x' to iqnore, and 'q' to exit)");
}



async function processFileWithDiffs(filePath: string, diff: string) {
    try {
      // Resolve the full path
      const fullPath = path.resolve(filePath);
  
      // Read the file contents
      const contents = await fs.readFile(fullPath, 'utf8');
  
      // Apply the diffs
      const modifiedContents = applyDiffs(contents, diff);
  
      // Write the modified contents back to the file
      await fs.writeFile(fullPath, modifiedContents, 'utf8');
  
    //   console.log(`Successfully processed and updated ${fullPath}`);
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
}

function applyIgnore(contents: string, start: number, end: number) {
    const lines = contents.split('\n');

    if (start < 1 || start > lines.length) {
        throw new Error('Invalid start line number');
    }

    const commentLineIndex = start - 1;
    let line = lines[commentLineIndex];
    let tabsOrSpaces = line.split("").filter(v => v==="\t"||v===" ");

    lines.splice(commentLineIndex, 0, `${tabsOrSpaces.join("")}// @pensar-ok`);

    return lines.join('\n');
}

async function ignoreIssue(issue: Issue) {
    try {
        // Resolve the full path
        const fullPath = path.resolve(issue.location);
    
        // Read the file contents
        const contents = await fs.readFile(fullPath, 'utf8');
    
        const modifiedContents = applyIgnore(contents, issue.startLineNumber, issue.endLineNumber);
    
        // Write the modified contents back to the file
        await fs.writeFile(fullPath, modifiedContents, 'utf8');
    
      //   console.log(`Successfully processed and updated ${fullPath}`);
      } catch (error) {
        console.error(`Error processing file ${issue.location}:`, error);
      }
}

function popDiffAtIndex(diffs: Diff[], index: number) {
    return diffs.filter((d,i) => i !== index);
}

function setDiffStatusAtIndex(diffs: Diff[], index: number, status: "applied" | "ignored") {
    return diffs.map((d, i) => {
        if(i === index) {
            return {
                ...d,
                status: status
            }
        }
        return d
    });
}

export function displayDiffs(diffs: Diff[]) {
    let currentDiff = 0;

    
    readline.emitKeypressEvents(process.stdin);
    if(process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }
    displayCurrentDiff(diffs[0]);

    process.stdin.on('keypress', async (str, key) => {
        if(key.name === "q") {
            process.exit();
        } else if (key.name === "right" && currentDiff < diffs.length - 1) {
            currentDiff++;
            displayCurrentDiff(diffs[currentDiff]);
        } else if (key.name === "left" && currentDiff > 0) {
            currentDiff--;
            displayCurrentDiff(diffs[currentDiff]);
        } else if (key.name === "a") {
            if(!diffs[currentDiff].status) {
                await processFileWithDiffs(diffs[currentDiff].issue.location, diffs[currentDiff].diff);
                diffs = setDiffStatusAtIndex(diffs, currentDiff, "applied");
                displayCurrentDiff(diffs[currentDiff]);
            }
        } else if (key.name === "x") {
            if(!diffs[currentDiff].status) {
                await ignoreIssue(diffs[currentDiff].issue);
                diffs = setDiffStatusAtIndex(diffs, currentDiff, "ignored");
                displayCurrentDiff(diffs[currentDiff]);
            }
        }
    });
}