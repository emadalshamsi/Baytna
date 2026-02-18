import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function pushToGitHub() {
  const token = await getAccessToken();
  const repo = 'emadalshamsi/Baytna';
  const [owner, repoName] = repo.split('/');
  
  console.log('Got GitHub token, pushing...');
  
  try {
    const result = execSync(
      `git push --force https://x-access-token:${token}@github.com/${repo}.git main`,
      { cwd: '/home/runner/workspace', stdio: 'pipe', timeout: 30000 }
    );
    console.log('Successfully pushed to GitHub!');
    console.log(result.toString());
  } catch (err: any) {
    console.error('Push failed:', err.stderr?.toString() || err.message);
    process.exit(1);
  }
}

pushToGitHub();
