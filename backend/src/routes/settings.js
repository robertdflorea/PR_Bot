const express = require('express');
const router  = express.Router();
const Settings     = require('../models/Settings');
const UserSettings = require('../models/UserSettings');
const { authMiddleware } = require('../middleware/auth');

/* ─── Dockerfile prompt ─── */
const DOCKERFILE_KEY = 'dockerfile_prompt';

const DEFAULT_DOCKERFILE_PROMPT = `Create a Dockerfile for this project. These are what you have to do step by step.
1. Runtime version: Check package.json engines field, .nvmrc, .python-version, setup.py, or any CI config files (.travis.yml, .github/workflows/) to determine what runtime version this project was built for. Use a base image that matches that era. Do not use a modern runtime for an old codebase.
2. Package manager: Check whether the project uses npm, yarn, or pnpm (look for lock files: package-lock.json, yarn.lock, pnpm-lock.yaml). Use the matching package manager in the Dockerfile. If using pnpm, ensure any dependency overrides go under pnpm.overrides, not resolutions.
3. Pin dependencies: In package.json (or requirements.txt for Python), pin all dependency versions to single exact versions. Version ranges like "^4.17.0" are not allowed. Version alternatives like "2.4.1 || 3.0.0" are also not allowed. Every entry must be one exact version like "4.17.21". After pinning, delete ALL lock files in the entire repository including all subdirectories. Run find . -name "package-lock.json" -o -name "yarn.lock" -o -name "pnpm-lock.yaml" -o -name "poetry.lock" -o -name "Pipfile.lock" -o -name "uv.lock" and remove every match. Do not commit any lock files. Use --no-frozen-lockfile for pnpm or equivalent flags so that dependencies resolve fresh at install time.
4. README: Update the README with instructions for installing dependencies and running tests locally. For example "npm install" and "npm test" or "pip install -r requirements.txt" and "pytest". Do not add Docker build or Docker run instructions to the README. Keep it focused on local setup only.
5. Build and test: The Dockerfile must install dependencies and build the project if needed. The CMD statement must be the test command, for example CMD ["npm", "test"]. Do not put tests only in a RUN step during build. Do not use a placeholder CMD like node -e "console.log('ready')". Do not serve the app via nginx or any other server. The container must execute the test suite when it runs.
6. Commit: After everything is done, configure git identity and commit all setup changes. Run these exact commands: git config user.name "PR Writer" && git config user.email "prwriter@reveloexperts.com" git add -A && git commit --author="PR Writer prwriter@reveloexperts.com" -m "Set up initial instructions"
After writing the Dockerfile, build it and run the container. Verify that tests produce real pass/fail output with actual test names and results, not just exit code 0 with no output. If tests fail or produce no output, fix the issue only by editing dockerfile, do not touch any codebase files and rebuild until it works. Do not ask me for confirmation at any step. Just do everything and show me the final result.`;

/* ─── First prompt generator template ─── */
const FIRST_PROMPT_KEY = 'first_prompt_generator';

const DEFAULT_FIRST_PROMPT_TEMPLATE = `I'm a PR Writer for the Revelo/Anthropic HFI project. I need to write the first prompt to send to a model via claude-hfi.

REQUIREMENTS FOR THE FIRST PROMPT:
- Rewrite the issue description in my own words (never copy-paste verbatim)
- Remove all links and images from the description
- Clearly and explicitly state what needs to be implemented
- Write as if addressing a mid-level software engineer
- Do NOT include instructions about writing tests, committing code, or how to approach the work
- Keep it concise and focused on the single task

PROJECT CONTEXT:
This is a data labeling project where I guide two AI models (A and B) to write production-ready code in a Git repository. I act as a peer reviewer evaluating their output across multiple turns until the solution is production-ready.

The project lead says: "Re-write the issue description in your own words. Ensure the prompt is clear and explicitly states the solution that should be implemented. Imagine you're sending this issue to a mid-level software engineer. Writing tests, covering edge cases, and committing the solution are already expected — so don't include that in your prompt. Remove any links and images that the issue description might have."

ISSUE TO WORK ON:
Title: {{ISSUE_TITLE}}
Repository: {{REPO}}
Language: {{LANGUAGE}}

Issue Description:
{{ISSUE_BODY}}

Based on the above, write the first prompt I should send to the model. Output ONLY the prompt text, with no preamble, no explanation, and no additional commentary.`;

/* ─── Workflow guide ─── */
const GUIDE_KEY = 'workflow_guide';

const DEFAULT_WORKFLOW_GUIDE = `TASK_TYPE: code_review_and_iteration_workflow

ROLE:
- Act as a PR reviewer.
- Goal: drive the task to a production-ready result.
- Standard: approve only if the final code would be acceptable in a real pull request.

CORE_OBJECTIVE:
- Select a suitable repository and issue.
- Prepare the repository.
- Work through multiple interactions until the solution is production-ready.
- Review outputs carefully.
- Choose the better result in each round.
- Submit the final task correctly.

PRODUCTION_READY_DEFINITION:
A solution is production-ready if all of the following are true:
- It fully implements the requested change.
- It handles realistic edge cases.
- It addresses relevant security concerns.
- It matches the existing codebase style and structure.
- It uses abstractions consistent with the repository.
- It includes good test coverage in the project's existing style.
- It avoids useless comments, obvious comments, and process narration.

ISSUE_SELECTION_RULES:
- Prefer pre-selected repositories and issues when available.
- Repository requirements:
  - Language must be Python, JavaScript, or TypeScript.
  - Must be hosted in Git.
  - Size must be 200 MB or less at selected commit.
  - Must be understandable enough for confident review.
  - Must have clear build and run instructions.
  - Must use standard dependency tooling.
  - Must include tests.
  - Must be written in English.
- Helpful but optional:
  - Linters configured.
  - Formatters configured.
  - Evidence of active usage or maintenance.
- Issue requirements:
  - Must be non-trivial.
  - Must require multiple iterations.
  - Must be one clear problem.
  - Must be medium or high complexity.
  - Must fit in a single engineering ticket.
- Avoid:
  - Tasks that are too broad.
  - Tasks that are too vague.
  - Tasks that are too trivial.
  - Bundles of unrelated tasks.

RECORDKEEPING_RULES:
- Once repository and issue are selected, record them in Revelo immediately.
- If issue is found to be too easy later, update the selection on the platform.

REPOSITORY_PREPARATION:
- Clone the repository locally.
- Check out the commit from before the issue was solved.
- For pre-selected issues, use base_sha from the spreadsheet.
- If repository is over 200 MB:
  - Reinitialize Git history at base_sha.
  - Commit only that state.

GIT_CONFIGURATION:
- Set local Git identity before committing.
- Use:
  git config user.name "PR Writer"
  git config user.email "prwriter@reveloexperts.com"

README_AND_DOCKER_REQUIREMENTS:
- Repository must include:
  - README with instructions for running the project and tests.
  - Working Dockerfile at repository root.
- Preparation tasks:
  - Pin dependency versions where needed.
  - Remove lock files if required.
  - Build successfully.
  - Run tests successfully.

SETUP_COMMIT:
- Commit setup changes with:
  git commit --author="PR Writer <prwriter@reveloexperts.com>" -m "Set up initial instructions"
- Save the initial commit SHA in Revelo.

HFI_STARTUP:
- From repository directory, create tmux session:
  tmux new -s task
- Inside tmux, run:
  claude-hfi --vscode
- When asked for interface code, enter:
  cc_agentic_coding
- Save the UUID produced by HFI (required at final submission).

FIRST_PROMPT_RULES:
- Rewrite the issue description in your own words.
- Keep it clear and direct.
- Describe the expected implementation as if speaking to a mid-level engineer.
- Remove links and images.
- Do not add unnecessary process instructions.

FOLLOW_UP_PROMPT_RULES:
- Treat all follow-ups as PR review comments.
- Focus only on remaining deficiencies.
- Do not expand scope.
- Continue until the solution is production-ready.
- Before ending, ensure final changes are committed.

PLATFORM_RUNTIME_RULE:
- Pause the task in Revelo whenever the tool is actively running.
- Resume the task in Revelo after each run completes.

REVIEW_PROCESS:
- After each interaction:
  - Review both outputs.
  - Inspect changed files.
  - Run tests.
  - Verify correctness, completeness, and engineering quality.
  - Identify remaining issues.
  - Provide PR-style feedback.
  - Select the stronger output.

EVALUATION_REQUIREMENTS:
- For every comparison:
  - Choose which model performed better.
  - Score evaluation axes independently.
  - Provide both pros and cons (concrete, specific).
  - Even the better answer must receive criticism where appropriate.

SUBMISSION_RULES:
- When solution is production-ready and fully committed:
  - Stop HFI with Ctrl + C.
  - Use the original repository folder (not a worktree).
  - Verify all expected changes and commits are present.

ARCHIVE_CREATION:
- From parent directory:
  cd ..
  tar cf final_result.tar <repo-folder>

REVELO_SUBMISSION:
- Enter the Anthropic UUID / Session ID.
- Paste the first prompt used.
- Upload final_result.tar.
- Select successful task result options.
- Submit.

ERROR_CASES:
If normal completion is not possible, classify appropriately in Revelo.
Common cases:
- Tool takes too long to respond.
- Issue remains unresolved after 6 interactions.
- Unexpected tool or model error.
In error cases: upload a complete screenshot and select the correct error outcome.

SPECIAL_CASES:
1. ISSUE_SOLVED_TOO_FAST:
   If solved in 2 or fewer interactions: end task, choose a new issue, repeat setup, update Revelo.
2. A_VS_B_EVALUATION:
   Inspect both outputs. Run tests. Write your own pros and cons. Preference score must match selected winner.
3. WHICH_RESULT_CONTINUES:
   Only the selected winning output carries into the next round.
4. FILES_TO_REMOVE:
   Remove generated artifacts: documentation dumps, test logs, complete_solution.md, etc.
5. PERFECT_TIE_CASE:
   Still choose one as slightly better. Complete all scoring. Keep scores aligned with winner.

STOP_CONDITION:
- Stop only when the implementation is complete, well-structured, tested, and approval-worthy in a professional code review.
- Do not stop merely because the code runs.

OUTPUT_STYLE_PREFERENCE:
- Prefer explicit instructions.
- Prefer low-ambiguity wording.
- Prefer short declarative statements.
- Prefer structured sections over narrative text.`;

/* ─── Global helpers (admin / system defaults) ─── */
async function getSetting(key, defaultValue) {
  let doc = await Settings.findOne({ key });
  if (!doc) doc = await Settings.create({ key, value: defaultValue });
  return doc.value;
}

async function setSetting(key, value) {
  return Settings.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
}

/* ─── Per-user helpers ─── */
async function getUserSetting(userId, key, defaultValue) {
  const userDoc = await UserSettings.findOne({ userId, key });
  if (userDoc) return userDoc.value;
  return getSetting(key, defaultValue);   // fall back to admin / system default
}

async function setUserSetting(userId, key, value) {
  return UserSettings.findOneAndUpdate(
    { userId, key },
    { value },
    { upsert: true, new: true }
  );
}

/* ─── Factory: build GET / PUT / POST-reset for one setting ─── */
function makeSettingRoutes(router, path, key, defaultValue, responseKey) {
  // GET — return user's value (or admin default)
  router.get(`/${path}`, authMiddleware, async (req, res) => {
    try {
      const value = await getUserSetting(req.user._id, key, defaultValue);
      res.json({ [responseKey]: value });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // PUT — admin updates system default; user updates their own copy
  router.put(`/${path}`, authMiddleware, async (req, res) => {
    const value = req.body[responseKey];
    if (typeof value !== 'string' || !value.trim())
      return res.status(400).json({ error: `${responseKey} must be a non-empty string` });
    try {
      if (req.user.role === 'admin') {
        const doc = await setSetting(key, value.trim());
        res.json({ [responseKey]: doc.value });
      } else {
        const doc = await setUserSetting(req.user._id, key, value.trim());
        res.json({ [responseKey]: doc.value });
      }
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // POST reset — admin resets system default to hardcoded; user deletes their override
  router.post(`/${path}/reset`, authMiddleware, async (req, res) => {
    try {
      if (req.user.role === 'admin') {
        const doc = await setSetting(key, defaultValue);
        res.json({ [responseKey]: doc.value });
      } else {
        await UserSettings.deleteOne({ userId: req.user._id, key });
        const value = await getSetting(key, defaultValue);
        res.json({ [responseKey]: value });
      }
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
}

/* ─── Register all settings ─── */
makeSettingRoutes(router, 'dockerfile-prompt',     DOCKERFILE_KEY,   DEFAULT_DOCKERFILE_PROMPT,    'prompt');
makeSettingRoutes(router, 'first-prompt-generator', FIRST_PROMPT_KEY, DEFAULT_FIRST_PROMPT_TEMPLATE, 'template');
makeSettingRoutes(router, 'workflow-guide',          GUIDE_KEY,        DEFAULT_WORKFLOW_GUIDE,        'guide');

module.exports = router;
