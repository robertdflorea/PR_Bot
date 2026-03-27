const fetch = require('node-fetch');

const BASE = 'https://api.github.com';

function parseIssueUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
}

async function githubGet(path, extraHeaders = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'pr-bot',
      ...extraHeaders,
    },
  });
  if (res.status === 403) throw new Error('GitHub rate limit exceeded. Wait ~1 hour or try again.');
  if (res.status === 404) throw new Error('Resource not found on GitHub.');
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

async function fetchLinkedPrFiles(owner, repo, prNumber) {
  try {
    const files = await githubGet(`/repos/${owner}/${repo}/pulls/${prNumber}/files`);
    return Array.isArray(files) ? files.length : null;
  } catch (_) {
    return null;
  }
}

async function fetchIssue(url) {
  const parsed = parseIssueUrl(url);
  if (!parsed) throw new Error('Invalid GitHub issue URL. Expected format: https://github.com/owner/repo/issues/123');

  const { owner, repo, number } = parsed;

  const [issue, repoData] = await Promise.all([
    githubGet(`/repos/${owner}/${repo}/issues/${number}`),
    githubGet(`/repos/${owner}/${repo}`),
  ]);

  let prNumber = null;
  let prUrl = null;
  let prFilesChanged = null;
  let linkedPrMerged = false;

  // Strategy 1: Timeline API — looks for cross-referenced merged PRs (most reliable)
  try {
    const timeline = await githubGet(
      `/repos/${owner}/${repo}/issues/${number}/timeline`,
      { Accept: 'application/vnd.github.mockingbird-preview+json' }
    );
    if (Array.isArray(timeline)) {
      const closingRef = timeline.find(
        (e) =>
          e.event === 'cross-referenced' &&
          e.source?.issue?.pull_request &&
          e.source.issue.pull_request.merged_at
      );
      if (closingRef) {
        const pr = closingRef.source.issue;
        prNumber = pr.number;
        prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;
        linkedPrMerged = true;
        prFilesChanged = await fetchLinkedPrFiles(owner, repo, prNumber);
      }
    }
  } catch (_) {}

  // Strategy 2: Search closed PRs for closing keywords or mention of this issue number
  if (!prNumber) {
    try {
      const closingKeywords = new RegExp(
        `(close[sd]?|fix(e[sd])?|resolve[sd]?)\\s+#${number}\\b`,
        'i'
      );
      const mentionPattern = new RegExp(`#${number}\\b`);

      const prs = await githubGet(
        `/repos/${owner}/${repo}/pulls?state=closed&per_page=100&sort=updated&direction=desc`
      );

      if (Array.isArray(prs)) {
        // Prefer: merged + closing keyword > merged + mention > any match
        const best =
          prs.find((pr) => pr.merged_at && closingKeywords.test(`${pr.title || ''} ${pr.body || ''}`)) ||
          prs.find((pr) => pr.merged_at && mentionPattern.test(`${pr.title || ''} ${pr.body || ''}`));

        if (best) {
          prNumber = best.number;
          prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;
          linkedPrMerged = !!best.merged_at;
          prFilesChanged = await fetchLinkedPrFiles(owner, repo, prNumber);
        }
      }
    } catch (_) {}
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
    prUrl,
    linkedPrMerged,
    htmlUrl: issue.html_url,
  };
}

module.exports = { fetchIssue, parseIssueUrl };
