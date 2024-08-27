import { getEncoding } from "js-tiktoken";
import OpenAI from "openai";
import { OAI_EXPLANATION_SYSTEM_MESSAGE, OAI_EXPLANATION_USER_MESSAGE, OAI_EXTRACT_SNIPPET_SYSTEM_MESSAGE, OAI_EXTRACT_SNIPPET_USER_MESSAGE, OAI_PR_SUMMARY_SYSTEM_MESSAGE, OAI_PR_SUMMARY_USER_MESSAGE, OAI_SYSTEM_MESSAGE, OAI_USER_MESSAGE } from "./prompts";
import type { Issue } from "@pensar/semgrep-node";

interface ErrorFixExplanationParams {
    fileContent: string;
    issue: Issue;
};

interface ExtractSnippetParams {
    fileContent: string;
    issue: Issue;
};

interface PrSummaryParams {
    issue: Issue;
    oldContent: string;
    newContent: string;
};

interface CodeEditParams {
    fileContent: string;
    snippet: string;
    issue: Issue;
    explanation: string;
};

const client = new OpenAI({
    baseURL: "http://localhost:8080/v1",
    apiKey: "sk-no-key-required"
});

export const numTokens = (content: string) => {
    const enc = getEncoding("cl100k_base");
    return enc.encode(content).length;
}

const addLineNumbers = (content: string): string => {
    return content.split("\n").map((line, i) => `${i+1} ${line}`).join("\n");
}

function extractLines(text: string, startLine: number, endLine: number): string {
    const lines = text.split('\n');
    return lines.slice(startLine - 1, endLine).join('\n');
}

const buildCodePrompt = (content: string, snippet: string, issue: Issue, explanation: string) => {
    let modifiedContent = addLineNumbers(content);
    return OAI_USER_MESSAGE.replace("<<error_message>>", `${issue.message}`)
                .replace("<<error_location>>", extractLines(content, issue.startLineNumber, issue.endLineNumber))
                .replace("<<error_snippet>>", snippet)
                .replace("<<contents>>", modifiedContent)
                .replace("<<file_name>>", issue.location)
                .replace("<<explanation_content>>", explanation);
}

const buildExplanationPrompt = (content: string, issue: Issue) => {
    return OAI_EXPLANATION_USER_MESSAGE.replace("<<error_message>>", `${issue.message}`)
                .replace("<<contents>>", content);
}

const buildExtractionPrompt = (content: string, startLineNumber: number, endLineNumber: number) => {
    const modifiedContent = addLineNumbers(content);
    const errorLocation = extractLines(modifiedContent, startLineNumber, endLineNumber);
    return OAI_EXTRACT_SNIPPET_USER_MESSAGE.replace("<<contents>>", modifiedContent)
                                .replace("<<error_location>>", errorLocation);
}

const buildPrSummaryPrompt = (params: PrSummaryParams) => {
    return OAI_PR_SUMMARY_USER_MESSAGE.replace("<security_issue>", JSON.stringify({ severity: params.issue.severity, message: params.issue.message }, undefined, 2))
                                .replace("<old_content>", params.oldContent)
                                .replace("<new_content>", params.newContent);
}

async function getCompletion(systemMessage: string, userMessage: string) {
    const resp = await client.chat.completions.create(
        {
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage }
            ],
            max_tokens: 4000 - numTokens(userMessage),
            temperature: 0.0,
        }
    );

    const result = resp.choices[0].message.content;
    if(!result) {
        throw new Error("Model response empty");
    }
    return result
}

const getExplanation = async(params: ErrorFixExplanationParams) => {
    const userMessage = buildExplanationPrompt(params.fileContent, params.issue);
    const resp = await getCompletion(OAI_EXPLANATION_SYSTEM_MESSAGE, userMessage);
    return resp
}

const extractSnippet = async(params: ExtractSnippetParams) => {
    const userMessage = buildExtractionPrompt(params.fileContent, params.issue.startLineNumber, params.issue.endLineNumber);
    const resp = await getCompletion(OAI_EXTRACT_SNIPPET_SYSTEM_MESSAGE, userMessage);
    return resp
}

const getCodeEdits = async(params: CodeEditParams) => {
    const userMessage = buildCodePrompt(params.fileContent, params.snippet, params.issue, params.explanation);
    const resp = await getCompletion(OAI_SYSTEM_MESSAGE, userMessage);
    return resp
}

export const codeGenDiff = async(fileContent: string, issue: Issue) => {
    const explanation = await getExplanation({
        fileContent: fileContent,
        issue: issue
    });

    const snippet = await extractSnippet({
        fileContent,
        issue
    });

    const diff = await getCodeEdits({
        fileContent,
        snippet,
        issue,
        explanation
    });

    return diff
}

export const getPrSummary = async(params: PrSummaryParams) => {
    const userMessage = buildPrSummaryPrompt(params);
    const resp = await getCompletion(OAI_PR_SUMMARY_SYSTEM_MESSAGE, userMessage);
    // TODO: strip markdown
    return resp
}




