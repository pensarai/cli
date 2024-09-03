import type { Issue } from "@pensar/semgrep-node";

export type Repository = {
    name: string;
    owner: string;
}

export type IssueItem = Issue & {
    uid: string;
    scanId: string;
};