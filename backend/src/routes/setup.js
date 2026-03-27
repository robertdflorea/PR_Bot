const express = require('express');
const router = express.Router();

// POST /api/setup/commands
// Returns the shell commands the user needs to run (never executed by the bot)
router.post('/commands', (req, res) => {
  const { repoUrl, baseSha, repoFolder } = req.body;

  const folder = repoFolder || '<repo-folder>';
  const sha = baseSha || '<base_sha>';

  const commands = [
    {
      label: 'Clone the repository',
      cmd: `git clone ${repoUrl || '<repo-url>'} ${folder}`,
      note: 'Skip if already cloned',
    },
    {
      label: 'Enter repo directory',
      cmd: `cd ${folder}`,
    },
    {
      label: 'Checkout the base SHA (state before issue was solved)',
      cmd: `git checkout ${sha}`,
    },
    {
      label: 'Set anonymous git identity',
      cmd: `git config user.name "PR Writer" && git config user.email "prwriter@reveloexperts.com"`,
    },
    {
      label: 'Start a tmux session (reconnect if terminal crashes)',
      cmd: `tmux new -s task`,
      note: 'To reattach: tmux attach -t task',
    },
    {
      label: 'Run HFI tool in VS Code mode',
      cmd: `claude-hfi --vscode`,
    },
    {
      label: 'After HFI starts — commit initial setup',
      cmd: `git add . && git commit --author="PR Writer <prwriter@reveloexperts.com>" -m "Set up initial instructions"`,
    },
    {
      label: 'Get the initial setup commit SHA (save this in Revelo)',
      cmd: `git log --oneline -1`,
    },
    {
      label: 'Compress repo for final submission',
      cmd: `cd .. && tar cf final_result.tar ${folder}`,
      note: 'Run after all model interactions are done',
    },
  ];

  res.json({ commands });
});

module.exports = router;
