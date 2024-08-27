import { Octokit } from "@octokit/action";
import type { Issue } from "@pensar/semgrep-node";
import type { Repository } from "../../lib/types";
import { applyDiffs } from "../utils";
import { getPrSummary } from "../completions";
import { nanoid } from "nanoid";

async function createPRWithChanges(
    octokit: Octokit,
    owner: string,
    repo: string,
    baseBranch: string,
    newBranchName: string,
    filePath: string,
    newContent: string,
    commitMessage: string,
    prTitle: string,
    prBody: string
) {
    try {
        // 1. Get the SHA of the latest commit on the base branch
        const { data: refData } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${baseBranch}`,
        });
        const baseSha = refData.object.sha;

        // 2. Create a new branch
        await octokit.rest.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${newBranchName}`,
            sha: baseSha,
        });

        // 3. Get the current file content
        const { data: fileData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: filePath,
            ref: newBranchName,
        });

        if (!('content' in fileData)) {
            throw new Error('File not found or is a directory');
        }

        // 4. Update the file content
        await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filePath,
            message: commitMessage,
            content: Buffer.from(newContent).toString('base64'),
            branch: newBranchName,
            sha: fileData.sha,
        });

        // 5. Create a pull request
        const { data: prData } = await octokit.rest.pulls.create({
            owner,
            repo,
            title: prTitle,
            head: newBranchName,
            base: baseBranch,
            body: prBody,
        });

        console.log(`Pull request created: ${prData.html_url}`);
        return prData.number;
    } catch (error) {
        console.error('Error creating pull request:', error);
        throw error;
    }
}

function normalizeFilePath(filepath: string): string {
    // Remove drive letter if present (for Windows paths)
    filepath = filepath.replace(/^[a-zA-Z]:/, '');
    
    // Convert backslashes to forward slashes
    filepath = filepath.replace(/\\/g, '/');
    // Remove leading slash
    filepath = filepath.replace(/^\//, '');
  
    return filepath;
}

export async function createPr(
    oldContent: string,
    issue: Issue,
    diff: string,
    repository: Repository
) {
    const octokit = new Octokit();

    const newContent = applyDiffs(oldContent, diff);

    const prSummary = await getPrSummary({
        issue,
        oldContent,
        newContent
    });

    await createPRWithChanges(
        octokit,
        repository.owner,
        repository.name,
        "main", // TODO: get branch from action env
        `pensar-fix-${nanoid(6)}`,
        normalizeFilePath(issue.location),
        newContent,
        `Fixing security issue found by Pensar: ${issue.message}`,
        `Fixing security issue found by Pensar: ${issue.message}`,
        prSummary
    );
}