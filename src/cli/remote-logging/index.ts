import { config } from "@/lib/config";
import { writeToLog } from "@/lib/logs";
import type { IssueItem, Repository } from "@/lib/types";

type ScanItem = {
    id: string;
    repository: Repository;
    runBy?: "github-action";
    issues: IssueItem[];
    timeStarted: number;
    timeEnded: number;
}

export interface LogScanResultOptions {
    repository: Repository;
    startTime: number;
    endTime: number;
    apiKey: string;
};

export interface UpdateIssueOptions {
    pullRequest?: string;
    closeMethod?: "manual" | "ignore" | "github-action";
    apiKey: string;
};

export async function logScanResultsToConsole(scanId: string, issues: IssueItem[], options: LogScanResultOptions) {
    const scanItem: ScanItem = {
        id: scanId,
        repository: options.repository,
        issues: issues,
        timeStarted: options.startTime,
        timeEnded: options.endTime
    };

    const resp = await fetch(`${config.API_URL}/upload-scan-results`, {
        method: "POST",
        body: JSON.stringify({
            apiKey: options.apiKey,
            scan: scanItem
        })
    });

    if(resp.status !== 201) {
        console.error(`There was an error uploading scan results: ${resp.status}`);
        writeToLog(`There was an error uploading scan results: ${resp.status}`);
    }
    writeToLog(`Scan successfully logged to console.penar.dev. scan-id=${scanId}`);
}

export async function updateIssueCloseStatus(scanId: string, issueUid: string, options: UpdateIssueOptions) {
    const resp = await fetch(`${config.API_URL}/${scanId}/${issueUid}`, {
        method: "POST",
        body: JSON.stringify({
            pullRequest: options.pullRequest,
            closeMethod: options.closeMethod,
            apiKey: options.apiKey
        })
    });

    if(resp.status !== 201) {
        console.error(`There was an error updating issue close status: ${resp.status}`);
        writeToLog(`There was an error updating issue close status: ${resp.status}`);
    }
    writeToLog(`Successfully updated issue close status. scan-id=${scanId} issue-id=${issueUid}`);
}