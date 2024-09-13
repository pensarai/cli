import { listRules } from "@pensar/semgrep-node";

export function listRulesetsCommandHandler() {
    let rulesets = listRules();
    console.log("--- Available rules ---");
    rulesets.forEach(r => console.log(`\n  - ${r}`));
}