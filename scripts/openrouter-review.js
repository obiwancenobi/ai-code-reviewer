#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    if (key === 'code_changes' || key === 'actor_data') {
      params[key] = JSON.parse(value);
    } else {
      params[key] = value;
    }
  }

  return params;
}

// Construct AI prompt
function constructPrompt(codeChanges, actorData) {
   let prompt = '';

   if (actorData && (actorData.name || actorData.role)) {
     const name = actorData.name || 'an unknown developer';
     const role = actorData.role || 'developer';
     prompt = `You are reviewing code submitted by ${name}, a ${role}. As an expert code reviewer, provide constructive feedback tailored to their role and expertise level. Consider best practices appropriate for their position while maintaining language-agnostic recommendations.

Please review the following code changes and provide constructive feedback:

`;
   } else {
     prompt = `You are an expert code reviewer. Please review the following code changes and provide constructive feedback:

`;
   }

  if (Array.isArray(codeChanges)) {
    codeChanges.forEach((change, index) => {
      prompt += `Change ${index + 1}:
File: ${change.file || 'Unknown'}
Type: ${change.type || 'modification'}
Content:
${change.content || change.diff || 'No content provided'}

`;
    });
  } else {
    prompt += `Code Changes:
${JSON.stringify(codeChanges, null, 2)}

`;
  }

  prompt += `
Provide your review in the following JSON format:
{
  "comments": [
    {
      "file": "filename",
      "line": 123,
      "type": "suggestion|issue|improvement",
      "message": "Your review comment here",
      "severity": "low|medium|high"
    }
  ],
  "summary": "Overall summary of the review"
}

Focus on code quality, best practices, potential bugs, and improvements. Be specific and actionable.`;

  return prompt;
}

// Call OpenRouter API
function callOpenRouter(model, apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(`API Error: ${res.statusCode} - ${response.error?.message || body}`));
          }
        } catch (error) {
          reject(new Error(`Parse Error: ${error.message} - Body: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Process chunks if provided
async function processChunks(model, apiKey, codeChanges, actorData) {
  const results = [];

  if (Array.isArray(codeChanges) && codeChanges.length > 1) {
    console.log(`Processing ${codeChanges.length} chunks...`);

    for (let i = 0; i < codeChanges.length; i++) {
      console.log(`Processing chunk ${i + 1}/${codeChanges.length}`);
      const chunk = codeChanges[i];
      const prompt = constructPrompt([chunk], actorData);
      const response = await callOpenRouter(model, apiKey, prompt);
      results.push(response);
    }
  } else {
    const prompt = constructPrompt(codeChanges, actorData);
    const response = await callOpenRouter(model, apiKey, prompt);
    results.push(response);
  }

  return results;
}

// Main function
async function main() {
  try {
    const params = parseArgs();

    if (!params.model || !params.api_key || !params.code_changes) {
      console.error('Missing required parameters: model, api_key, code_changes');
      process.exit(1);
    }

    console.log('Starting AI code review...');

    const results = await processChunks(params.model, params.api_key, params.code_changes, params.actor_data);

    // Process and combine results
    const combinedComments = [];
    let summary = '';

    results.forEach((result, index) => {
      if (result.choices && result.choices[0] && result.choices[0].message) {
        const content = result.choices[0].message.content;
        try {
          const parsed = JSON.parse(content);
          if (parsed.comments) {
            combinedComments.push(...parsed.comments);
          }
          if (parsed.summary && index === 0) {
            summary = parsed.summary;
          }
        } catch (error) {
          console.warn(`Failed to parse response from chunk ${index + 1}: ${error.message}`);
          // Fallback: treat as plain text comment
          combinedComments.push({
            file: 'unknown',
            line: 0,
            type: 'comment',
            message: content,
            severity: 'medium'
          });
        }
      }
    });

    const output = {
      comments: combinedComments,
      summary: summary || 'Review completed',
      total_chunks: results.length
    };

    console.log('Review completed successfully');
    console.log(JSON.stringify(output, null, 2));

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { constructPrompt, callOpenRouter, processChunks };