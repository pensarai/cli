import type { Diff } from "@/cli/commands/scan/apply-patch";
import type { Issue } from "@pensar/semgrep-node";

export type Repository = {
    name: string;
    owner: string;
}

export type IssueItem = Issue & {
    uid: string;
    scanId: string;
};

export type MainViewProps = {
    diffs: Diff[];
    scanId: string;
    noLogging: boolean;
    apiKey?: string;
};