import * as core from '@actions/core';
import * as github from '@actions/github';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const DEFAULT_MODEL = 'gemini-1.5-flash';
const DEFAULT_TEMPERATURE = 0.1;

async function run() {
    try {
        const apiKey = core.getInput('geminiApiKey', { required: true });
        const githubToken = core.getInput('githubToken', { required: true });
        const modelName = core.getInput('model') || DEFAULT_MODEL;
        const temperature = parseFloat(core.getInput('temperature')) || DEFAULT_TEMPERATURE;
        const debug = core.getBooleanInput('debug');

        const context = github.context;
        const pr = context.payload.pull_request;

        if (!pr) {
            core.setFailed('This action can only be run on pull_request or pull_request_target events.');
            return;
        }

        const patchUrl = pr.diff_url;
        core.info(`Fetching PR diff from: ${patchUrl}`);
        
        const response = await axios.get(patchUrl, {
            headers: {
                Authorization: `token ${githubToken}`,
                Accept: 'application/vnd.github.v3.diff',
            },
        });
        const patchContent = response.data;
        core.info(`Fetched patch content. Length: ${patchContent.length} characters.`);

        const genAI = new GoogleGenerativeAI(apiKey);
        
        const DEFAULT_SYSTEM_INSTRUCTION = 
            `You are a professional software engineer reviewing a code patch for the repository ${context.repo.owner}/${context.repo.repo}.\n` +
            `Your goal is to identify potential bugs, security vulnerabilities, performance issues, and maintainability improvements.\n` +
            `Instructions:\n` +
            `1. Focus on critical issues and meaningful improvements.\n` +
            `2. Lines starting with '-' are removed; lines starting with '+' are added.\n` +
            `3. Provide at least 5 actionable feedback points if possible.\n` +
            `4. Format your response in Markdown.\n` +
            `5. Start each feedback point with "- [ ] " to make it a checklist item.\n` +
            `6. Be concise and professional.`;

        const systemInstruction = core.getInput('systemMessage') || DEFAULT_SYSTEM_INSTRUCTION;

        if (debug) {
            core.info(`System Instruction: ${systemInstruction}`);
        }

        const model = genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: systemInstruction,
        });

        const generationConfig = {
            temperature: temperature,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 2048,
        };

        core.info('Sending patch to Gemini for review...');
        console.time('gemini-review-cost');
        
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: `Please review this code patch:\n\n${patchContent}` }] }],
            generationConfig,
        });
        
        const reviewText = result.response.text();
        console.timeEnd('gemini-review-cost');

        if (debug) {
            core.info(`Review result: ${reviewText}`);
        }

        const octokit = github.getOctokit(githubToken);
        await octokit.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: pr.number,
            body: `### ♊ Gemini Code Review\n\n${reviewText}`,
        });

        core.info('Review comment posted successfully.');

    } catch (error) {
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}

run();
