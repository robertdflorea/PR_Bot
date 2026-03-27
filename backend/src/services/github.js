const fetch = require('node-fetch');

const BASE = 'https://api.github.com';

function parseIssueUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
}

async function githubGet(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'pr-bot' },
  });
  if (res.status === 403) throw new Error('GitHub rate limit exceeded. Wait ~1 hour or try again.');
  if (res.status === 404) throw new Error('Resource not found on GitHub.');
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

async function fetchIssue(url) {
  const parsed = parseIssueUrl(url);
  if (!parsed) throw new Error('Invalid GitHub issue URL. Expected format: https://github.com/owner/repo/issues/123');

  const { owner, repo, number } = parsed;

  const [issue, repoData] = await Promise.all([
    githubGet(`/repos/${owner}/${repo}/issues/${number}`),
    githubGet(`/repos/${owner}/${repo}`),
  ]);

  // Find linked PR (closed issues often have a linked PR via timeline or search)
  let prFilesChanged = null;
  let prNumber = null;
  try {
    const prs = await githubGet(
      `/repos/${owner}/${repo}/pulls?state=closed&per_page=30`
    );
    // Heuristic: find PR whose title or body references this issue number
    const linked = prs.find(
      (pr) =>
        (pr.body && pr.body.match(new RegExp(`#${number}\\b`))) ||
        (pr.title && pr.title.match(new RegExp(`#${number}\\b`)))
    );
    if (linked) {
      prNumber = linked.number;
      const files = await githubGet(`/repos/${owner}/${repo}/pulls/${linked.number}/files`);
      prFilesChanged = files.length;
    }
  } catch (_) {
    // PR lookup is best-effort
  }

  return {
    owner,
    repo,
    issueNumber: number,
    title: issue.title,
    body: issue.body || '',
    state: issue.state,
    language: repoData.language,
    repoSizeKb: repoData.size,
    prFilesChanged,
    prNumber,
    htmlUrl: issue.html_url,
  };
}

module.exports = { fetchIssue, parseIssueUrl };
