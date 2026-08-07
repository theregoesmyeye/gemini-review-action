# Gemini Smart Review ♊

A GitHub Action that provides AI-powered code reviews using Google's Gemini models. This action helps you catch bugs, performance issues, and security vulnerabilities directly in your repository.

Unlike other review actions, this one supports **non-PR workflows**, including reviewing commit changes on `push` and performing **full codebase reviews** on demand.

## Features

- **Gemini Powered**: Uses Google's state-of-the-art Gemini 1.5 Flash or Pro models.
- **Large Context**: Leverages Gemini's massive context window to handle large PR diffs or **entire repositories**.
- **Multi-Mode Support**: 
  - **Pull Requests**: Automatically comments on PRs.
  - **Push**: Reviews changes in a commit and logs them to the console.
  - **Full Review**: Reviews the whole codebase via manual trigger.
- **Actionable Feedback**: Generates a checklist of feedback points.

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `geminiApiKey` | Your Google Gemini API Key. | Yes | - |
| `githubToken` | GitHub token for API access. | Yes | `${{ github.token }}` |
| `mode` | `auto`, `diff`, or `full`. | No | `auto` |
| `model` | Gemini model to use. | No | `gemini-1.5-flash` |
| `temperature` | Sampling temperature. | No | `0.1` |
| `systemMessage` | Custom instructions for the AI reviewer. | No | - |

## Example Usage

### 1. Reviewing Pull Requests
```yaml
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: theregoesmyeye/gemini-review-action@main
        with:
          geminiApiKey: ${{ secrets.GEMINI_API_KEY }}
```

### 2. Reviewing Commits on Push (No PR)
If you don't use PRs, the action will review the changes in your push and print the results to the Action logs.
```yaml
on:
  push:
    branches: [main]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: theregoesmyeye/gemini-review-action@main
        with:
          geminiApiKey: ${{ secrets.GEMINI_API_KEY }}
```

### 3. Full Codebase Review (Manual)
Trigger a review of your entire repository manually from the "Actions" tab.
```yaml
on:
  workflow_dispatch: # Allows manual trigger
jobs:
  full-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4 # Required for full codebase review
      - uses: theregoesmyeye/gemini-review-action@main
        with:
          geminiApiKey: ${{ secrets.GEMINI_API_KEY }}
          mode: 'full'
```

## Outputs

| Output | Description |
|--------|-------------|
| `review` | The generated review text. |

## License

MIT
