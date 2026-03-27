/**
 * Strips markdown links, image tags, and bare URLs from text.
 */
function stripLinksAndImages(text) {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '') // markdown images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // markdown links → keep label
    .replace(/https?:\/\/\S+/g, '') // bare URLs
    .replace(/\n{3,}/g, '\n\n') // collapse excess blank lines
    .trim();
}

/**
 * Generates the first prompt: issue description rewritten in plain language.
 * The user will paste this into Claude manually.
 */
function generateFirstPrompt(issueData, customContext) {
  const cleanBody = stripLinksAndImages(issueData.body || '');

  let prompt = `${issueData.title}\n\n`;

  if (cleanBody) {
    prompt += `${cleanBody}\n\n`;
  }

  if (customContext && customContext.trim()) {
    prompt += `Additional context: ${customContext.trim()}\n\n`;
  }

  return prompt.trim();
}

/**
 * Generates a follow-up PR-review-style prompt template.
 * The user fills in [bracketed] placeholders.
 */
function generateFollowUpTemplate(notes) {
  const lines = [];

  if (notes && notes.trim()) {
    lines.push(notes.trim());
  } else {
    lines.push(
      'Please review the changes you made and ensure:',
      '',
      '- All edge cases identified in the issue are handled',
      '- The new code matches the style of the existing codebase',
      '- No unnecessary comments have been added',
      '- All modified files are committed'
    );
  }

  return lines.join('\n');
}

/**
 * Generates the final "commit and wrap up" prompt.
 */
function generateFinalPrompt() {
  return 'Please commit all final changes with a clear, descriptive commit message before we finish.';
}

module.exports = { generateFirstPrompt, generateFollowUpTemplate, generateFinalPrompt, stripLinksAndImages };
