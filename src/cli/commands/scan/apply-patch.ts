import type { Issue } from "@pensar/semgrep-node";
import fs from "fs/promises";
import path from "path";
import { applyDiffs } from "../../utils";
import type { IssueItem, MainViewProps } from "@/lib/types";
import { renderMainView } from "../../views/out";

export type Diff = {
    diff: string;
    issue: IssueItem;
    status?: "applied" | "ignored";
};

export async function processFileWithDiffs(filePath: string, diff: string) {
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

export async function ignoreIssue(issue: Issue) {
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


export function displayDiffs(props: MainViewProps) {
    renderMainView(props);
}