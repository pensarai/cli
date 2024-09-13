import { getEncoding } from "js-tiktoken";
import OpenAI from "openai";
import { EXPLANATION_SYSTEM_MESSAGE, EXPLANATION_USER_MESSAGE, EXTRACT_SNIPPET_SYSTEM_MESSAGE, EXTRACT_SNIPPET_USER_MESSAGE, PR_SUMMARY_SYSTEM_MESSAGE, PR_SUMMARY_USER_MESSAGE, BASE_SYSTEM_MESSAGE, BASE_USER_MESSAGE } from "./prompts";
import type { Issue } from "@pensar/semgrep-node";
import { config } from "@/lib/config";

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

export interface CompletionClientOptions {
    pensarApiKey?: string;
    local?: boolean;
};

const getCompletionClient = (options: CompletionClientOptions) => {
    let baseUrl = options.local ? "http://localhost:8080/v1/" : `${config.API_URL}/oai/v1`;
    let pensarApiKey = options.pensarApiKey??process.env.PENSAR_API_KEY;
    if(!options.local && !pensarApiKey) {
        throw new Error("Pensar API key required if not using `--local` option. Run `pensar set-token [api-key]` to set the default API key, set the API key as the `PENSAR_API_KEY` env variable, or explicitly pass it to the `--api-key` option.");
    }
    const client = new OpenAI({
        baseURL: baseUrl,
        apiKey: options.local ? "sk-no-key-required" : pensarApiKey
    });
    return client
}

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
    return BASE_USER_MESSAGE.replace("<<error_message>>", `${issue.message}`)
                .replace("<<error_location>>", extractLines(content, issue.startLineNumber, issue.endLineNumber))
                .replace("<<error_snippet>>", snippet)
                .replace("<<contents>>", modifiedContent)
                .replace("<<file_name>>", issue.location)
                .replace("<<explanation_content>>", explanation);
}

const buildExplanationPrompt = (content: string, issue: Issue) => {
    return EXPLANATION_USER_MESSAGE.replace("<<error_message>>", `${issue.message}`)
                .replace("<<contents>>", content);
}

const buildExtractionPrompt = (content: string, startLineNumber: number, endLineNumber: number) => {
    const modifiedContent = addLineNumbers(content);
    const errorLocation = extractLines(modifiedContent, startLineNumber, endLineNumber);
    return EXTRACT_SNIPPET_USER_MESSAGE.replace("<<contents>>", modifiedContent)
                                .replace("<<error_location>>", errorLocation);
}

const buildPrSummaryPrompt = (params: PrSummaryParams) => {
    return PR_SUMMARY_USER_MESSAGE.replace("<security_issue>", JSON.stringify({ severity: params.issue.severity, message: params.issue.message }, undefined, 2))
                                .replace("<old_content>", params.oldContent)
                                .replace("<new_content>", params.newContent);
}

async function getCompletion(systemMessage: string, userMessage: string, clientOptions: CompletionClientOptions) {
    const client = getCompletionClient(clientOptions);

    const resp = await client.chat.completions.create(
        {
            // model: "/home/ubuntu/pensar-local/src/server/models/DeepSeek-Coder-V2-Lite-Instruct-Q6_K.gguf",
            // model: "/home/ubuntu/pensar-local/src/server/models/Meta-Llama-3.1-8B-Instruct-Q6_K.gguf",
            model: "main",
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

const getExplanation = async(params: ErrorFixExplanationParams, clientOptions: CompletionClientOptions) => {
    const userMessage = buildExplanationPrompt(params.fileContent, params.issue);
    const resp = await getCompletion(EXPLANATION_SYSTEM_MESSAGE, userMessage, clientOptions);
    return resp
}

const extractSnippet = async(params: ExtractSnippetParams, clientOptions: CompletionClientOptions) => {
    const userMessage = buildExtractionPrompt(params.fileContent, params.issue.startLineNumber, params.issue.endLineNumber);
    const resp = await getCompletion(EXTRACT_SNIPPET_SYSTEM_MESSAGE, userMessage, clientOptions);
    return resp
}

const getCodeEdits = async(params: CodeEditParams, clientOptions: CompletionClientOptions) => {
    const userMessage = buildCodePrompt(params.fileContent, params.snippet, params.issue, params.explanation);
    const resp = await getCompletion(BASE_SYSTEM_MESSAGE, userMessage, clientOptions);
    return resp
}

export const codeGenDiff = async(fileContent: string, issue: Issue, clientOptions: CompletionClientOptions) => {
    const [explanation, snippet] = await Promise.all([
        await getExplanation({
            fileContent: fileContent,
            issue: issue,
        }, clientOptions),
        await extractSnippet({
            fileContent,
            issue
        }, clientOptions)
    ]);

    const diff = await getCodeEdits({
        fileContent,
        snippet,
        issue,
        explanation
    }, clientOptions);

    return diff
}

export const getPrSummary = async(params: PrSummaryParams, clientOptions: CompletionClientOptions) => {
    const userMessage = buildPrSummaryPrompt(params);
    const resp = await getCompletion(PR_SUMMARY_SYSTEM_MESSAGE, userMessage, clientOptions);
    return resp.replace("```", "");
}




