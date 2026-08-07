# Gemini Smart Review ♊

A GitHub Action that provides AI-powered code reviews using Google's Gemini models. This action helps you catch bugs, performance issues, and security vulnerabilities directly in your Pull Requests.

Inspired by [Smart Review](https://github.com/marketplace/actions/smart-review), but powered by Gemini's large context window and advanced reasoning.

## Features

- **Gemini Powered**: Uses Google's state-of-the-art Gemini 1.5 Flash or Pro models.
- **Large Context**: Leverages Gemini's massive context window to handle large PR diffs that might fail with other models.
- **Customizable**: Adjust the review focus and style via a custom system message.
- **Actionable Feedback**: Generates a checklist of feedback points directly in the PR comments.

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `geminiApiKey` | Your Google Gemini API Key. | Yes | - |
| `githubToken` | GitHub token for posting comments. | Yes | `${{ github.token }}` |
| `model` | Gemini model to use. | No | `gemini-1.5-flash` |
| `temperature` | Sampling temperature. | No | `0.1` |
| `systemMessage` | Custom instructions for the AI reviewer. | No | See default below |
| `debug` | Enable verbose logging. | No | `false` |

## Example Usage

Create a file named `.github/workflows/gemini-review.yml` in your repository:

```yaml
name: Gemini Review

permissions:
  contents: read
  pull-requests: write

on:
  pull_request:
    types: [opened, synchronize]
  # Or use pull_request_target if you want to support forks (requires caution)
  # pull_request_target:
  #   types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Gemini Code Review
        uses: theregoesmyeye/gemini-review-action@main
        with:
          geminiApiKey: ${{ secrets.GEMINI_API_KEY }}
          # githubToken is automatically provided
```

## Default System Message

If not provided, the action uses the following instructions:

> You are a professional software engineer reviewing a code patch for the repository {owner}/{repo}.
> Your goal is to identify potential bugs, security vulnerabilities, performance issues, and maintainability improvements.
> Instructions:
> 1. Focus on critical issues and meaningful improvements.
> 2. Lines starting with '-' are removed; lines starting with '+' are added.
> 3. Provide at least 5 actionable feedback points if possible.
> 4. Format your response in Markdown.
> 5. Start each feedback point with "- [ ] " to make it a checklist item.
> 6. Be concise and professional.

## License

MIT
