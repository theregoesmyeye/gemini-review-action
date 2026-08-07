import * as core from '@actions/core';
import * as github from '@actions/github';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const DEFAULT_MODEL = 'gemini-1.5-flash';
const DEFAULT_TEMPERATURE = 0.1;

async function getDiff(octokit, context) {
    if (context.payload.pull_request) {
        const patchUrl = context.payload.pull_request.diff_url;
        const response = await axios.get(patchUrl, {
            headers: {
                Authorization: `token ${core.getInput('githubToken')}`,
                Accept: 'application/vnd.github.v3.diff',
            },
        });
        return response.data;
    } else if (context.eventName === 'push') {
        const response = await octokit.rest.repos.compareCommits({
            owner: context.repo.owner,
            repo: context.repo.repo,
            base: context.payload.before,
            head: context.payload.after,
            mediaType: { format: 'diff' },
        });
        return response.data;
    }
    return null;
}

async function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
            }
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });
    return arrayOfFiles;
}

async function getFullCodebase() {
    const workspace = process.env.GITHUB_WORKSPACE;
    if (!workspace) {
        throw new Error('GITHUB_WORKSPACE not found. Make sure to use actions/checkout before this action.');
    }
    const allFiles = await getAllFiles(workspace);
    let combinedContent = '';
    for (const file of allFiles) {
        const relativePath = path.relative(workspace, file);
        const content = fs.readFileSync(file, 'utf8');
        combinedContent += `\n--- File: ${relativePath} ---\n${content}\n`;
    }
    return combinedContent;
}

async function run() {
    try {
        const apiKey = core.getInput('geminiApiKey', { required: true });
        const githubToken = core.getInput('githubToken', { required: true });
        const modelName = core.getInput('model') || DEFAULT_MODEL;
        const temperature = parseFloat(core.getInput('temperature')) || DEFAULT_TEMPERATURE;
        const mode = core.getInput('mode') || 'auto'; // auto, diff, full
        const debug = core.getBooleanInput('debug');

        const context = github.context;
        const octokit = github.getOctokit(githubToken);

        let contentToReview = '';
        let reviewTarget = '';

        if (mode === 'full' || (mode === 'auto' && context.eventName === 'workflow_dispatch')) {
            core.info('Mode: Full Codebase Review');
            contentToReview = await getFullCodebase();
            reviewTarget = 'Full Codebase';
        } else {
            core.info('Mode: Diff Review');
            contentToReview = await getDiff(octokit, context);
            reviewTarget = context.payload.pull_request ? `PR #${context.payload.pull_request.number}` : `Push ${context.payload.after.substring(0, 7)}`;
        }

        if (!contentToReview) {
            core.warning('No content found to review. Skipping.');
            return;
        }

        core.info(`Content length to review: ${contentToReview.length} characters.`);

        const genAI = new GoogleGenerativeAI(apiKey);
        
        const DEFAULT_SYSTEM_INSTRUCTION = 
            `You are a professional software engineer reviewing the code for the repository ${context.repo.owner}/${context.repo.repo}.\n` +
            `Review Target: ${reviewTarget}\n` +
            `Your goal is to identify potential bugs, security vulnerabilities, performance issues, and maintainability improvements.\n` +
            `Instructions:\n` +
            `1. Focus on critical issues and meaningful improvements.\n` +
            `2. If reviewing a diff: Lines starting with '-' are removed; lines starting with '+' are added.\n` +
            `3. If reviewing a full codebase: Provide a high-level architectural review and identify specific file-level issues.\n` +
            `4. Provide actionable feedback points.\n` +
            `5. Format your response in Markdown.\n` +
            `6. Start each feedback point with "- [ ] " to make it a checklist item.\n` +
            `7. Be concise and professional.`;

        const systemInstruction = core.getInput('systemMessage') || DEFAULT_SYSTEM_INSTRUCTION;

        const model = genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: systemInstruction,
        });

        core.info('Sending content to Gemini for review...');
        const result = await model.generateContent(`Please review this ${reviewTarget.toLowerCase()}:\n\n${contentToReview}`);
        const reviewText = result.response.text();

        const formattedReview = `### ♊ Gemini Code Review - ${reviewTarget}\n\n${reviewText}`;

        if (context.payload.pull_request) {
            await octokit.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.payload.pull_request.number,
                body: formattedReview,
            });
            core.info('Review comment posted to PR.');
        } else {
            core.info('\n' + '='.repeat(40) + '\nGEMINI REVIEW RESULT\n' + '='.repeat(40) + '\n');
            core.info(formattedReview);
            core.info('\n' + '='.repeat(40) + '\n');
            
            // Also set as output
            core.setOutput('review', reviewText);
        }

    } catch (error) {
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}

run();
