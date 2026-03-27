const ALLOWED_LANGUAGES = ['JavaScript', 'TypeScript', 'Python'];

const DEFAULT_CRITERIA = [
  {
    key: 'has_description',
    label: 'Has a description',
    description: 'Issue body must not be empty',
    enabled: true,
    weight: 2,
  },
  {
    key: 'description_length',
    label: 'Description is detailed enough',
    description: 'Body should be at least 100 characters',
    enabled: true,
    weight: 2,
  },
  {
    key: 'correct_language',
    label: 'Repository language is JS/TS/Python',
    description: 'Only JavaScript, TypeScript, or Python repos are valid',
    enabled: true,
    weight: 3,
  },
  {
    key: 'issue_is_closed',
    label: 'Issue is closed (solution verifiable)',
    description: 'Closed issues have a known solution to compare against',
    enabled: true,
    weight: 1,
  },
  {
    key: 'repo_size',
    label: 'Repository size ≤ 200 MB',
    description: 'Repos over 200 MB slow the model down',
    enabled: true,
    weight: 3,
  },
  {
    key: 'pr_files_changed',
    label: 'Linked PR changed ≥ 4 files',
    description: 'PR must touch at least 4 code files (tests count)',
    enabled: true,
    weight: 2,
  },
  {
    key: 'not_trivial',
    label: 'Not trivially short title',
    description: 'Issue title suggests a real task, not a rename or typo fix',
    enabled: true,
    weight: 1,
  },
  {
    key: 'in_english',
    label: 'Appears to be in English',
    description: 'Description contains mostly ASCII/English characters',
    enabled: true,
    weight: 2,
  },
];

function evaluate(issueData, criteria) {
  const activeCriteria = criteria.filter((c) => c.enabled);
  const results = [];
  let totalWeight = 0;
  let passedWeight = 0;

  for (const criterion of activeCriteria) {
    const result = checkCriterion(criterion.key, issueData);
    results.push({ key: criterion.key, label: criterion.label, ...result });
    totalWeight += criterion.weight;
    if (result.passed) passedWeight += criterion.weight;
  }

  const score = totalWeight > 0 ? passedWeight / totalWeight : 0;

  // Any blocker (weight >= 3) that fails → bad
  const blockerFailed = activeCriteria.some(
    (c) => c.weight >= 3 && !results.find((r) => r.key === c.key)?.passed
  );

  let verdict;
  if (blockerFailed || score < 0.5) verdict = 'bad';
  else if (score >= 0.8) verdict = 'good';
  else verdict = 'warning';

  return { verdict, score, results };
}

function checkCriterion(key, data) {
  switch (key) {
    case 'has_description':
      return data.body && data.body.trim().length > 0
        ? { passed: true, message: 'Issue has a description' }
        : { passed: false, message: 'Issue has no description — skip it' };

    case 'description_length': {
      const len = (data.body || '').replace(/\s+/g, ' ').trim().length;
      return len >= 100
        ? { passed: true, message: `Description is ${len} characters` }
        : { passed: false, message: `Description too short (${len} chars, need ≥100)` };
    }

    case 'correct_language':
      return ALLOWED_LANGUAGES.includes(data.language)
        ? { passed: true, message: `Language is ${data.language}` }
        : {
            passed: false,
            message: `Language is "${data.language || 'unknown'}" — must be JS, TS, or Python`,
          };

    case 'issue_is_closed':
      return data.state === 'closed'
        ? { passed: true, message: 'Issue is closed' }
        : { passed: false, message: 'Issue is still open — no verified solution to compare' };

    case 'repo_size': {
      const mb = (data.repoSizeKb || 0) / 1024;
      return mb <= 200
        ? { passed: true, message: `Repo is ~${mb.toFixed(1)} MB` }
        : { passed: false, message: `Repo is ~${mb.toFixed(1)} MB — exceeds 200 MB limit` };
    }

    case 'pr_files_changed':
      if (data.prFilesChanged === null)
        return { passed: false, message: 'Could not find a linked PR to check file count' };
      return data.prFilesChanged >= 4
        ? { passed: true, message: `Linked PR changed ${data.prFilesChanged} files` }
        : {
            passed: false,
            message: `Linked PR only changed ${data.prFilesChanged} file(s) — need ≥4`,
          };

    case 'not_trivial': {
      const trivialPatterns = /\b(rename|typo|fix typo|add comma|whitespace|formatting|bump version)\b/i;
      return !trivialPatterns.test(data.title || '')
        ? { passed: true, message: 'Title does not suggest a trivial change' }
        : { passed: false, message: 'Title suggests a trivial change (rename/typo/formatting)' };
    }

    case 'in_english': {
      const text = (data.title || '') + ' ' + (data.body || '');
      const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length;
      const ratio = text.length > 0 ? nonAscii / text.length : 0;
      return ratio < 0.15
        ? { passed: true, message: 'Content appears to be in English' }
        : { passed: false, message: `High non-ASCII ratio (${(ratio * 100).toFixed(0)}%) — may not be English` };
    }

    default:
      return { passed: true, message: 'Unknown criterion (skipped)' };
  }
}

module.exports = { evaluate, DEFAULT_CRITERIA };
