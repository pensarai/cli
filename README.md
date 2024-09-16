# Pensar CLI
Find and automatically fix security vulnerabilities in your codebase. Open source and free to get started.

Read the full docs [here](https://docs.pensar.dev).

- Open source and free to use
- Can be self-hosted
- Runs either as cli or in github actions
- Auto-fix vulnerabilities the instant they are found
- No more triaging or SaaS dashboards
- Support for multiple language and standards like OWASP10

## Installation
If you have node installed you can get started with Pensar locally.
```
npm install @pensar/cli -g
```

This will install the CLI globally and give you access to the `pensar` command.

To use in a github action, [check out our docs](https://docs.pensar.dev/getting-started/github-action).


## How does it work?
Pensar is built on top of open source static analysis tools to detect vulnerabilities in your codebase.

When a vulnerability is found, we then use an LLM to generate changes that can be applied to your project to close said vulnerability.

You can either use our API endpoint for generating auto-fixes or run the cli in local mode with the `--local` flag set. Running in local mode will download model weights to your machine and spin up a local inference server. Read more about [local mode here.](https://docs.pensar.dev/misc/local-mode).
