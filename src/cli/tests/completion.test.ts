import type { Issue } from "@pensar/semgrep-node";
import { expect, test, describe } from "vitest";
import { codeGenDiff } from "../completions";

const mockIssue: Issue = {
    location: "./artifacts/insecure-document.js",
    startLineNumber: 5,
    endLineNumber: 5,
    issueId: "insecure-document-method",
    message: "User controlled data in methods like `innerHTML`, `outerHTML` or `document.write` is an anti-pattern that can lead to XSS vulnerabilities",
    severity: "high"
};

const fileContents = `const el = element.innerHTML;

function bad1(userInput) {
// ruleid: insecure-document-method
  el.innerHTML = '<div>' + userInput + '</div>';
}

function bad2(userInput) {
// ruleid: insecure-document-method
  document.body.outerHTML = userInput;
}

function bad3(userInput) {
  const name = '<div>' + userInput + '</div>';
// ruleid: insecure-document-method
  document.write(name);
}

function ok1() {
  const name = "<div>it's ok</div>";
// ok: insecure-document-method
  el.innerHTML = name;
}

function ok2() {
// ok: insecure-document-method
  document.write("<div>it's ok</div>");
}`;

describe("Test completions endpoint", () => {
    // let proc: Subprocess<"ignore", "pipe", null>;

    // beforeAll(async () => {
    //     console.log("Starting llama-cpp server...");
    //     proc = await spawnLlamaCppServer();
    //     console.log("Server started");
    // });

    // afterAll(() => {
    //     console.log("Cleaning server...");
    //     if(proc) {
    //         proc.kill("SIGKILL");
    //     }
    //     console.log("Done");
    // });

    test("Diff generation", async () => {
        const diff = await codeGenDiff(fileContents, mockIssue, { local: false });
        console.log(diff);
        expect(diff.length).toBeGreaterThan(0);
    }, { timeout: 10_000*10 });
})