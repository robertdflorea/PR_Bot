'use client';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import VerdictBadge from '../components/VerdictBadge';
import CriteriaList from '../components/CriteriaList';
import CopyButton from '../components/CopyButton';

const TABS = [
  { id: 'Issue Checker',   label: '1. Issue Checker' },
  { id: 'Setup Commands',  label: '2. Setup Commands' },
  { id: 'Prompts',         label: '3. Prompts' },
];

/* ─── tiny localStorage helpers ─── */
function lsGet(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ─── info banner shared across tabs ─── */
function InfoBox({ children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-lg border border-indigo-800 bg-indigo-950/40 text-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-indigo-300 hover:text-indigo-200 transition-colors"
      >
        <span className="font-medium flex items-center gap-2">
          <span className="text-indigo-400">ℹ</span> What to do here
        </span>
        <span className="text-xs text-indigo-500">{open ? '▲ hide' : '▼ show'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 text-indigo-200 leading-relaxed space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── prompt instruction box ─── */
function PromptInstruction({ children }) {
  return (
    <div className="rounded border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300 leading-relaxed">
      <span className="font-semibold text-amber-200">What to do with this prompt: </span>
      {children}
    </div>
  );
}

/* ─── saved indicator ─── */
function SavedLabel({ show }) {
  return show
    ? <span className="text-xs text-green-500 animate-pulse">● auto-saved</span>
    : null;
}

/* ─── step navigation ─── */
function StepNav({ onPrev, onNext }) {
  return (
    <div className="flex justify-between pt-5 mt-4 border-t border-zinc-800">
      {onPrev ? (
        <button
          onClick={onPrev}
          className="px-4 py-2 text-sm rounded border border-zinc-600 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
        >
          ← Prev
        </button>
      ) : <div />}
      {onNext ? (
        <button
          onClick={onNext}
          className="px-4 py-2 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
        >
          Next →
        </button>
      ) : <div />}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   AUTH GATE
════════════════════════════════════════════════════ */
function normalizeUrl(val) {
  const t = val.trim();
  if (!t) return t;
  if (!t.startsWith('http://') && !t.startsWith('https://')) return 'http://' + t;
  return t;
}

function BackendUrlModal({ onClose }) {
  const [draft, setDraft] = useState(
    () => (typeof window !== 'undefined' ? localStorage.getItem('backendUrl') || 'http://localhost:4500' : 'http://localhost:4500')
  );

  function handleSave() {
    const normalized = normalizeUrl(draft) || draft.trim();
    if (normalized) localStorage.setItem('backendUrl', normalized);
    else localStorage.removeItem('backendUrl');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl p-6 space-y-4 shadow-2xl">
        <h2 className="text-base font-semibold text-zinc-200">Backend URL</h2>
        <p className="text-xs text-zinc-500">Enter the address of the PR Bot backend server.</p>
        <input
          className="w-full px-3 py-2 rounded border border-zinc-600 bg-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
          placeholder="http://172.16.98.11:4500"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-zinc-600 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthGate({ onLogin }) {
  const [mode, setMode]       = useState('login');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState(
    () => (typeof window !== 'undefined' ? localStorage.getItem('prbot_last_email') || '' : '')
  );
  const [password, setPassword] = useState(
    () => (typeof window !== 'undefined' ? localStorage.getItem('prbot_last_pw') || '' : '')
  );
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [savedUrl, setSavedUrl] = useState(
    () => (typeof window !== 'undefined' ? localStorage.getItem('backendUrl') || 'http://localhost:4500' : 'http://localhost:4500')
  );

  function handleModalClose() {
    setSavedUrl(
      (typeof window !== 'undefined' ? localStorage.getItem('backendUrl') || 'http://localhost:4500' : 'http://localhost:4500')
    );
    setShowUrlModal(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      if (mode === 'login') {
        const { token, user } = await api.login(email, password);
        if (rememberMe) {
          localStorage.setItem('prbot_last_email', email);
          localStorage.setItem('prbot_last_pw', password);
        } else {
          localStorage.removeItem('prbot_last_email');
          localStorage.removeItem('prbot_last_pw');
        }
        onLogin(token, user);
      } else {
        const data = await api.register(name, email, password);
        if (data.token) {
          localStorage.setItem('prbot_last_email', email);
          onLogin(data.token, data.user);
        } else {
          setSuccess(data.message);
          setMode('login');
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      {showUrlModal && <BackendUrlModal onClose={handleModalClose} />}

      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-400">PR Bot</h1>
            <p className="text-xs text-zinc-500 mt-1">Revelo / Anthropic HFI helper</p>
          </div>
          <button
            onClick={() => setShowUrlModal(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 rounded px-2 py-1 transition-colors mt-1"
            title="Configure backend URL"
          >
            ⚙ Backend URL
          </button>
        </div>

        <div className="text-xs text-zinc-600 bg-zinc-800/50 rounded px-3 py-2 truncate">
          {savedUrl}
        </div>

        <div className="flex rounded-lg overflow-hidden border border-zinc-700">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === m ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        {success && (
          <div className="bg-green-900/40 border border-green-700 rounded p-3 text-sm text-green-300">{success}</div>
        )}
        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded p-3 text-sm text-red-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Name</label>
              <input
                className="w-full px-3 py-2 rounded border border-zinc-600 bg-zinc-800 text-sm"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded border border-zinc-600 bg-zinc-800 text-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded border border-zinc-600 bg-zinc-800 text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {mode === 'login' && (
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-indigo-500"
              />
              Remember me
            </label>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded text-sm font-medium transition-colors"
          >
            {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   ROOT LAYOUT
════════════════════════════════════════════════════ */
export default function Home() {
  const [tab, setTab]               = useState('Issue Checker');
  const [backendUrl, setBackendUrl] = useState('');
  const [connected, setConnected]   = useState(null);
  const [user, setUser]             = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('backendUrl');
    if (stored) setBackendUrl(stored);
    const activeTab = lsGet('prbot_active_tab', 'Issue Checker');
    setTab(activeTab);
    checkHealth(stored || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500');

    const token = localStorage.getItem('prbot_token');
    if (token) {
      api.getMe()
        .then((d) => setUser(d.user))
        .catch(() => localStorage.removeItem('prbot_token'))
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  async function checkHealth(url) {
    try {
      const res = await fetch(`${url}/api/health`);
      setConnected(res.ok);
    } catch {
      setConnected(false);
    }
  }

  function saveBackendUrl(url) {
    const normalized = normalizeUrl(url);
    setBackendUrl(normalized);
    localStorage.setItem('backendUrl', normalized);
    window.location.reload();
  }

  function switchTab(t) {
    setTab(t);
    lsSet('prbot_active_tab', t);
    setShowUserMenu(false);
  }

  function handleLogin(token, loggedInUser) {
    localStorage.setItem('prbot_token', token);
    setUser(loggedInUser);
  }

  function handleLogout() {
    localStorage.removeItem('prbot_token');
    setUser(null);
    setShowUserMenu(false);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="text-zinc-500 text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) return <AuthGate onLogin={handleLogin} />;

  const visibleTabs = user.role === 'admin'
    ? [...TABS, { id: 'Users', label: 'Users' }]
    : TABS;

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30">
      <header className="bg-zinc-900 border-b border-zinc-700 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-indigo-400">PR Bot</h1>
          <p className="text-xs text-zinc-500">Revelo / Anthropic HFI helper</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              connected === true
                ? 'bg-green-800 text-green-300'
                : connected === false
                ? 'bg-red-800 text-red-300'
                : 'bg-zinc-700 text-zinc-400'
            }`}
          >
            {connected === true ? 'Backend connected' : connected === false ? 'Backend offline' : 'Checking…'}
          </span>
          <input
            className="text-xs px-2 py-1 rounded border w-56"
            placeholder="http://172.16.98.11:4500"
            defaultValue={backendUrl}
            onBlur={(e) => e.target.value !== backendUrl && saveBackendUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveBackendUrl(e.target.value)}
          />
          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
            >
              {user.avatarPath
                ? <img src={`${apiBase}${user.avatarPath}`} alt="" className="w-6 h-6 rounded-full object-cover" />
                : <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">{user.name[0].toUpperCase()}</span>
              }
              <span className="max-w-[100px] truncate">{user.name}</span>
              <span className="text-zinc-500 text-xs">{showUserMenu ? '▲' : '▼'}</span>
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50 py-1">
                <div className="px-3 py-1.5 text-xs text-zinc-500 border-b border-zinc-700 truncate">{user.email}</div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-zinc-900 border-b border-zinc-700 px-6 flex gap-1 overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      </div>

      {/* Content — all panels rendered but only active one is visible so state is never destroyed */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className={tab === 'Issue Checker'  ? '' : 'hidden'}><IssueChecker  onNext={() => switchTab('Setup Commands')} /></div>
        <div className={tab === 'Setup Commands' ? '' : 'hidden'}><SetupCommands onPrev={() => switchTab('Issue Checker')}  onNext={() => switchTab('Prompts')} /></div>
        <div className={tab === 'Prompts'        ? '' : 'hidden'}><Prompts       onPrev={() => switchTab('Setup Commands')} /></div>
        {user.role === 'admin' && (
          <div className={tab === 'Users' ? '' : 'hidden'}><UsersAdmin /></div>
        )}
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   STEP 1 — ISSUE CHECKER
════════════════════════════════════════════════════ */
const DEFAULT_STANDARD = `Repo requirements:
• Language: Python, JavaScript, or TypeScript (Git repo)
• Size: ≤ 200 MB at the selected commit
• Understandable, executable (clear build/run instructions), dependency-complete (pip/conda/npm), has tests, English only

Good issue:
• Detailed description
• PR changes many files with actual code (not just imports/comments/docs)
• Issue is closed — solution can be verified
• Complex enough to require 3+ meaningful steps from the model

Bad issue:
• No or minimal description
• PR changes only a few files
• Changes are trivial (docs-only, minor imports, comments)
• Solved in 1–2 steps → automatic rejection

Rules:
• Too-simple issues = automatic rejection
• Time spent searching does NOT count as work time — use the spreadsheet
• Always verify language, size, and PR file count even with the spreadsheet
• If model solves too quickly, restart on the same page with a different issue`;

function IssueChecker({ onNext }) {
  const [url, setUrl]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [stdText, setStdText]   = useState(() => lsGet('prbot_std_text', DEFAULT_STANDARD));
  const [editingStd, setEditingStd] = useState(false);

  useEffect(() => {
    setUrl(lsGet('prbot_issue_url', ''));
    setResult(lsGet('prbot_issue_result', null));
  }, []);

  useEffect(() => lsSet('prbot_issue_url',  url),     [url]);
  useEffect(() => lsSet('prbot_std_text',   stdText), [stdText]);
  useEffect(() => { if (result) lsSet('prbot_issue_result', result); }, [result]);

  async function handleCheck() {
    if (!url.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await api.checkIssue(url.trim(), undefined, undefined);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Step 1 — Issue Checker</h2>

      <InfoBox>
        <p>Enter a GitHub issue URL. The bot automatically checks language, repo size, PR file count, description quality, and whether the issue is closed.</p>
        <p className="text-xs text-indigo-400 mt-1">
          <span className="text-green-400 font-medium">Good</span> — proceed.{' '}
          <span className="text-yellow-400 font-medium">Warning</span> — may work, has concerns.{' '}
          <span className="text-red-400 font-medium">Bad</span> — pick a different issue.
        </p>
      </InfoBox>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm text-zinc-400 mb-1">GitHub Issue URL</label>
          <input
            className="w-full px-3 py-2 rounded border text-sm"
            placeholder="https://github.com/owner/repo/issues/123"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
          />
        </div>
        <button
          onClick={handleCheck}
          disabled={loading || !url.trim()}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded text-sm font-medium transition-colors"
        >
          {loading ? 'Checking…' : 'Check Issue'}
        </button>
      </div>

      {/* Editable evaluation standard */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700">
          <span className="text-sm font-medium text-zinc-300">Evaluation Standard</span>
          <button
            onClick={() => setEditingStd((v) => !v)}
            className="text-xs px-2 py-0.5 rounded border border-zinc-600 text-zinc-400 hover:text-indigo-400 hover:border-indigo-700 transition-colors"
          >
            {editingStd ? '✓ Done' : '✎ Edit'}
          </button>
        </div>
        {editingStd ? (
          <textarea
            className="w-full px-4 py-3 bg-transparent text-xs text-zinc-300 font-mono resize-none focus:outline-none"
            rows={18}
            value={stdText}
            onChange={(e) => setStdText(e.target.value)}
          />
        ) : (
          <pre className="px-4 py-3 text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap font-sans">{stdText}</pre>
        )}
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded p-3 text-sm text-red-300">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-zinc-200">{result.issueData.title}</span>
              <div className="flex items-center gap-2">
                <SavedLabel show />
                <VerdictBadge verdict={result.verdict} />
              </div>
            </div>
            <div className="text-xs text-zinc-400 mb-3">
              {result.issueData.owner}/{result.issueData.repo} #{result.issueData.issueNumber} ·{' '}
              {result.issueData.language} · {result.issueData.state} · Score: {result.score}%
            </div>

            {/* Linked PR — most critical check */}
            {result.issueData.prNumber ? (
              <div className={`rounded-lg p-3 mb-3 flex items-center justify-between ${
                result.issueData.linkedPrMerged
                  ? 'bg-green-950/50 border border-green-700'
                  : 'bg-yellow-950/50 border border-yellow-700'
              }`}>
                <div className="space-y-0.5">
                  <span className={`text-xs font-semibold ${result.issueData.linkedPrMerged ? 'text-green-300' : 'text-yellow-300'}`}>
                    {result.issueData.linkedPrMerged ? '✓ Merged PR found' : '⚠ Linked PR (not confirmed merged)'}
                    {' '}— #{result.issueData.prNumber}
                  </span>
                  <div className="flex items-center gap-2">
                    {result.issueData.prFilesChanged != null && (
                      <span className="text-xs text-zinc-400">{result.issueData.prFilesChanged} files changed</span>
                    )}
                    {result.issueData.prUrl && (
                      <span className="text-xs font-mono text-zinc-500 truncate max-w-xs">{result.issueData.prUrl}</span>
                    )}
                  </div>
                </div>
                {result.issueData.prUrl && <CopyButton text={result.issueData.prUrl} />}
              </div>
            ) : (
              <div className="rounded-lg p-3 mb-3 bg-red-950/50 border border-red-700">
                <span className="text-xs font-semibold text-red-300">
                  ✕ No linked merged PR found — verify manually on GitHub before proceeding
                </span>
              </div>
            )}

            <CriteriaList results={result.results} />
          </div>
          <p className="text-xs text-indigo-400 border border-indigo-800 bg-indigo-950/30 rounded px-3 py-2">
            Go to <strong>Step 2 — Setup Commands</strong> to continue setup.
          </p>
        </div>
      )}

      <StepNav onNext={onNext} />
    </div>
  );
}

/* ════════════════════════════════════════════════════
   STEP 2 — SETUP COMMANDS
════════════════════════════════════════════════════ */

/* Reusable shell command card */
function ShellCommandCard({ step, label, cmd, note }) {
  return (
    <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-zinc-300">
          <span className="text-indigo-400 mr-1">{step}.</span>
          {label}
        </span>
        <CopyButton text={cmd} />
      </div>
      <code className="block text-sm font-mono text-indigo-300 bg-zinc-900 rounded px-3 py-2 break-all">
        {cmd}
      </code>
      {note && (
        <p className="text-xs text-amber-400/80 mt-1.5 border-t border-zinc-700 pt-1.5">⚠ {note}</p>
      )}
    </div>
  );
}

/* Generic copyable reference card */
function CopyInfoCard({ label, value, note }) {
  return (
    <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        {value && <CopyButton text={value} />}
      </div>
      {value ? (
        <code className="block text-sm font-mono text-teal-300 bg-zinc-900 rounded px-3 py-2 break-all">
          {value}
        </code>
      ) : (
        <p className="text-xs text-zinc-500 italic px-1">not set yet</p>
      )}
      {note && (
        <p className="text-xs text-amber-400/80 mt-1.5 border-t border-zinc-700 pt-1.5">⚠ {note}</p>
      )}
    </div>
  );
}

/* Shared editable AI prompt card */
function EditableAiCard({ step, title, subtitle, instruction, lsKey, getFn, updateFn, resetFn, resetMsg, accentColor, renderContent }) {
  const colors = {
    violet: {
      border: 'border-violet-700', bg: 'bg-violet-950/30',
      label: 'text-violet-300', step: 'text-violet-400', note: 'text-violet-500',
      pre: 'text-violet-200', taBorder: 'border-violet-600',
    },
    emerald: {
      border: 'border-emerald-700', bg: 'bg-emerald-950/30',
      label: 'text-emerald-300', step: 'text-emerald-400', note: 'text-emerald-500',
      pre: 'text-emerald-200', taBorder: 'border-emerald-600',
    },
    zinc: {
      border: 'border-zinc-600', bg: 'bg-zinc-800/40',
      label: 'text-zinc-300', step: 'text-zinc-400', note: 'text-zinc-500',
      pre: 'text-zinc-300', taBorder: 'border-zinc-600',
    },
  };
  const c = colors[accentColor] || colors.violet;

  const [content, setContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getFn()
      .then((d) => {
        const val = d.prompt || d.template || d.guide || '';
        setContent(val);
        lsSet(lsKey, val);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function startEdit() { setDraft(content); setEditing(true); setSaveMsg(''); }

  async function save() {
    setSaving(true); setSaveMsg('');
    try {
      const d = await updateFn(draft);
      const val = d.prompt || d.template || d.guide || '';
      setContent(val); lsSet(lsKey, val);
      setEditing(false); setSaveMsg('Saved.');
    } catch (e) { setSaveMsg(`Error: ${e.message}`); }
    finally { setSaving(false); }
  }

  async function reset() {
    if (!confirm(resetMsg || 'Reset to default?')) return;
    setSaving(true);
    try {
      const d = await resetFn();
      const val = d.prompt || d.template || d.guide || '';
      setContent(val); lsSet(lsKey, val); setDraft(val);
      setSaveMsg('Reset to default.');
    } catch (e) { setSaveMsg(`Error: ${e.message}`); }
    finally { setSaving(false); }
  }

  const displayed = renderContent ? renderContent(content) : content;

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-3 space-y-2`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${c.label}`}>
          {step != null && <span className={`${c.step} mr-1`}>{step}.</span>}
          {title}
          {subtitle && <span className={`ml-2 ${c.note} font-normal`}>{subtitle}</span>}
        </span>
        <div className="flex items-center gap-2">
          {!editing && <CopyButton text={displayed} />}
          {!editing ? (
            <button onClick={startEdit} className={`text-xs px-2 py-0.5 rounded bg-zinc-700/60 hover:bg-zinc-600 ${c.label} transition-colors`}>Edit</button>
          ) : (
            <>
              <button onClick={save} disabled={saving} className="text-xs px-2 py-0.5 rounded bg-green-800 hover:bg-green-700 text-green-200 disabled:opacity-50 transition-colors">{saving ? 'Saving…' : 'Save'}</button>
              <button onClick={() => setEditing(false)} className="text-xs px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors">Cancel</button>
              <button onClick={reset} disabled={saving} className="text-xs px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-400 disabled:opacity-50 transition-colors">Reset default</button>
            </>
          )}
        </div>
      </div>

      {instruction && (
        <div className="rounded border border-amber-800/50 bg-amber-950/25 px-3 py-2 text-xs text-amber-300 leading-relaxed">
          <span className="font-semibold text-amber-200">What to do: </span>
          {instruction}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-zinc-500 italic">Loading…</p>
      ) : editing ? (
        <textarea
          className={`w-full px-3 py-2 rounded border ${c.taBorder} bg-zinc-900 text-sm text-zinc-200 resize-y font-sans leading-relaxed`}
          rows={16}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      ) : (
        <pre className={`text-sm ${c.pre} whitespace-pre-wrap font-sans leading-relaxed bg-zinc-900 rounded px-3 py-2 max-h-64 overflow-y-auto`}>
          {displayed}
        </pre>
      )}

      {saveMsg && (
        <p className={`text-xs ${saveMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{saveMsg}</p>
      )}
    </div>
  );
}

/* Dockerfile prompt card — violet */
function DockerfilePromptCard({ step }) {
  return (
    <EditableAiCard
      step={step}
      title="Create Dockerfile"
      subtitle="(Claude Code / AI prompt — copy &amp; paste)"
      instruction={
        <>
          Open Claude Code (or any AI assistant) inside the cloned repository directory and paste this prompt.
          It will create the Dockerfile, pin dependencies, update the README, and make the initial commit automatically.
          Do <strong>not</strong> run this inside the claude-hfi session — this is a separate pre-setup step.
        </>
      }
      lsKey="prbot_dockerfile_prompt"
      getFn={api.getDockerfilePrompt}
      updateFn={api.updateDockerfilePrompt}
      resetFn={api.resetDockerfilePrompt}
      resetMsg="Reset to the default Dockerfile prompt?"
      accentColor="violet"
    />
  );
}

/* git log step card */
function GitLogCard({ step }) {
  const cmd = 'git log --oneline -5';
  return (
    <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-zinc-300">
          <span className="text-indigo-400 mr-1">{step}.</span>
          Check recent commits — note the HEAD SHA
        </span>
        <CopyButton text={cmd} />
      </div>
      <code className="block text-sm font-mono text-indigo-300 bg-zinc-900 rounded px-3 py-2 break-all">
        {cmd}
      </code>
      <p className="text-xs text-amber-400/80 mt-1.5 border-t border-zinc-700 pt-1.5">
        ⚠ Copy the topmost (HEAD) commit SHA and paste it into the field below. This is required by Revelo.
      </p>
    </div>
  );
}

/* HEAD commit SHA input + copy card */
function HeadCommitCard({ value, onChange }) {
  return (
    <div className="rounded-lg border border-teal-700 bg-teal-950/25 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-teal-300">Save Initial Setup Commit SHA</span>
        {value && <CopyButton text={value} />}
      </div>
      <p className="text-xs text-teal-400/80">
        Paste the HEAD commit hash from <code className="bg-zinc-800 px-1 rounded">git log</code> above.
        It will appear in the reference section below and is required by Revelo.
      </p>
      <input
        className="w-full px-3 py-2 rounded border border-teal-700 bg-zinc-900 text-sm font-mono text-teal-200 placeholder-teal-800"
        placeholder="e.g. a1b2c3d"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* Optional tmux attach card */
function TmuxAttachCard() {
  const cmd = 'tmux attach -t task';
  return (
    <div className="bg-zinc-800/50 rounded-lg p-3 border border-dashed border-zinc-600">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-zinc-400">
          <span className="text-zinc-500 mr-1">↳</span>
          (Optional) Re-attach to existing tmux session
        </span>
        <CopyButton text={cmd} />
      </div>
      <code className="block text-sm font-mono text-zinc-400 bg-zinc-900 rounded px-3 py-2">
        {cmd}
      </code>
      <p className="text-xs text-zinc-500 mt-1.5">
        Use this only if you had a tmux session already running and need to re-attach.
      </p>
    </div>
  );
}

/* cc_agentic_coding sky card */
function CcAgenticCard({ step }) {
  const text = 'cc_agentic_coding';
  return (
    <div className="rounded-lg border border-sky-700 bg-sky-950/25 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-sky-300">
          {step && <span className="text-indigo-400 mr-1">{step}.</span>}
          Enable agentic coding mode in claude-hfi
        </span>
        <CopyButton text={text} />
      </div>
      <p className="text-xs text-sky-400/80">
        Type this command inside the claude-hfi VS Code session to switch to agentic coding mode.
        Do this before sending your first prompt to the model.
      </p>
      <code className="block text-sm font-mono text-sky-200 bg-zinc-900 rounded px-3 py-2">
        {text}
      </code>
    </div>
  );
}


function SetupCommands({ onPrev, onNext }) {
  const [repoUrl,      setRepoUrl]      = useState('');
  const [baseSha,      setBaseSha]      = useState('');
  const [commands,     setCommands]     = useState([]);
  const [headCommit,   setHeadCommit]   = useState('');
  const [issueResult,  setIssueResult]  = useState(null);
  const [summaryText,  setSummaryText]  = useState('');

  useEffect(() => {
    setRepoUrl(lsGet('prbot_setup_repo_url', ''));
    setBaseSha(lsGet('prbot_setup_base_sha', ''));
    setCommands(lsGet('prbot_setup_commands', []));
    setHeadCommit(lsGet('prbot_head_commit', ''));
    setIssueResult(lsGet('prbot_issue_result', null));
    setSummaryText(lsGet('prbot_summary_text', ''));
  }, []);

  useEffect(() => lsSet('prbot_setup_repo_url', repoUrl),    [repoUrl]);
  useEffect(() => lsSet('prbot_setup_base_sha', baseSha),    [baseSha]);
  useEffect(() => lsSet('prbot_setup_commands', commands),   [commands]);
  useEffect(() => lsSet('prbot_head_commit',    headCommit), [headCommit]);
  useEffect(() => lsSet('prbot_summary_text',   summaryText),[summaryText]);

  const repoFolder = repoUrl.split('/').filter(Boolean).pop() || '';

  const effectiveRepoUrl =
    issueResult?.issueData?.owner && issueResult?.issueData?.repo
      ? `https://github.com/${issueResult.issueData.owner}/${issueResult.issueData.repo}`
      : repoUrl;

  async function generate() {
    const d = await api.getSetupCommands(repoUrl, baseSha, repoFolder);
    setCommands(d.commands);
    const issueUrl = lsGet('prbot_issue_url', '');
    setSummaryText(
      `1. ${repoFolder || '<local-folder>'}\n2. issue: ${issueUrl || '<issue-url>'}\n3. Four interactions`
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Step 2 — Setup Commands</h2>

      <InfoBox>
        <p>
          After selecting a <span className="text-green-400 font-medium">Good</span> issue, fill in
          the fields below and click "Generate Commands". Run each step in order.
        </p>
        <ol className="list-decimal list-inside ml-2 space-y-1 text-xs text-indigo-300">
          <li>Clone the repository.</li>
          <li>Enter the repo folder.</li>
          <li>Checkout the <strong>base SHA</strong> — the state of the code before the issue was solved.</li>
          <li>Configure git with the required PR Writer identity.</li>
          <li className="text-violet-300">
            <strong>Create Dockerfile</strong> — paste the AI prompt into Claude Code (not claude-hfi).
          </li>
          <li>Run <code className="bg-indigo-950/40 px-1 rounded">git log</code> and save the HEAD commit SHA in the field below.</li>
          <li>Start a new tmux session.</li>
          <li>Launch claude-hfi in VS Code mode.</li>
          <li>Type <code className="bg-sky-950/40 px-1 rounded">cc_agentic_coding</code> inside the claude-hfi session.</li>
        </ol>
        <p className="text-xs text-indigo-400 mt-1">
          Blue = shell commands · Violet = Dockerfile AI prompt · Teal = SHA to save · Sky = agentic mode
        </p>
      </InfoBox>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Repository URL</label>
          <input className="w-full px-3 py-2 rounded border text-sm" placeholder="https://github.com/owner/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Base SHA (from the spreadsheet column)</label>
          <input className="w-full px-3 py-2 rounded border text-sm font-mono" placeholder="abc1234def..." value={baseSha} onChange={(e) => setBaseSha(e.target.value)} />
        </div>
        {repoFolder && (
          <div className="px-3 py-2 rounded border border-zinc-700 bg-zinc-800/50 text-sm text-zinc-400">
            <span className="text-zinc-500 text-xs">Local folder → </span>
            <span className="font-mono text-teal-300">{repoFolder}</span>
          </div>
        )}
      </div>

      <button onClick={generate} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium">
        Generate Commands
      </button>

      {commands.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-300">Commands</span>
            <SavedLabel show />
          </div>

          {/* Steps 1–4: clone, cd, checkout, git config */}
          {commands.slice(0, 4).map((c, i) => (
            <ShellCommandCard key={i} step={i + 1} label={c.label} cmd={c.cmd} note={c.note} />
          ))}

          {/* Step 5: Dockerfile AI prompt */}
          <DockerfilePromptCard step={5} />

          {/* Optional section: commit, get SHA, compress (steps 9–11 moved here for reference) */}
          {commands.slice(6).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide pt-1">
                Optional — reference steps (run when appropriate)
              </p>
              {commands.slice(6).map((c, i) => (
                <div key={`opt-${i}`} className="bg-zinc-800/40 rounded-lg border border-dashed border-zinc-600">
                  <ShellCommandCard step={null} label={`(Optional) ${c.label}`} cmd={c.cmd} note={c.note} />
                </div>
              ))}
            </div>
          )}

          {/* Step 6: git log */}
          <GitLogCard step={6} />

          {/* HEAD commit SHA input */}
          <HeadCommitCard value={headCommit} onChange={setHeadCommit} />

          {/* Step 7: tmux new -s task */}
          {commands[4] && (
            <ShellCommandCard step={7} label={commands[4].label} cmd={commands[4].cmd} note={commands[4].note} />
          )}

          {/* Optional: tmux attach */}
          <TmuxAttachCard />

          {/* Step 8: claude-hfi --vscode */}
          {commands[5] && (
            <ShellCommandCard step={8} label={commands[5].label} cmd={commands[5].cmd} note={commands[5].note} />
          )}

          {/* Step 9: cc_agentic_coding */}
          <CcAgenticCard step={9} />

          {/* Quick reference */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Quick Reference — copy as needed</p>
            <CopyInfoCard label="GitHub Repository URL" value={effectiveRepoUrl} />
            <CopyInfoCard label="GitHub Issue URL" value={lsGet('prbot_issue_url', '')} />
            <CopyInfoCard label="Initial Setup Commit SHA" value={headCommit} note="Required by Revelo — paste this into the platform" />
          </div>
        </div>
      )}

      {/* HFI Workflow Guide — stored in DB, editable */}
      <EditableAiCard
        step={null}
        title="HFI Workflow Guide"
        subtitle="(stored in database — editable reference)"
        instruction={null}
        lsKey="prbot_guide_text"
        getFn={api.getWorkflowGuide}
        updateFn={api.updateWorkflowGuide}
        resetFn={api.resetWorkflowGuide}
        resetMsg="Reset workflow guide to default?"
        accentColor="zinc"
      />

      {/* Session summary card — appears after Generate Commands is clicked */}
      {summaryText && (
        <div className="rounded-lg border border-amber-700 bg-amber-950/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Session Summary</span>
            <CopyButton text={summaryText} />
          </div>
          <textarea
            className="w-full px-3 py-2 rounded border border-amber-800 bg-zinc-900 text-sm font-mono text-amber-200 resize-y"
            rows={3}
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
          />
        </div>
      )}

      <StepNav onPrev={onPrev} onNext={onNext} />
    </div>
  );
}


/* ════════════════════════════════════════════════════
   HELPERS — Prompts tab
════════════════════════════════════════════════════ */

const BAND        = ['A4', 'A3', 'A2', 'A1', 'B1', 'B2', 'B3', 'B4'];
const BAND_SYMBOL = { A4: 'A', A3: 'O', A2: 'o', A1: '.', B1: '.', B2: 'o', B3: 'O', B4: 'B' };

function BandDisplay({ value }) {
  if (!value) return <span className="text-xs text-zinc-600 italic">—</span>;
  return (
    <div className="flex items-center gap-1">
      {BAND.map((v) => {
        const isSelected = v === value;
        const isA = v.startsWith('A');
        return (
          <div key={v} className="flex flex-col items-center">
            <div className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold font-mono ${
              isSelected
                ? isA ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'bg-amber-600 text-white ring-2 ring-amber-400'
                : 'bg-zinc-800 text-zinc-600 border border-zinc-700'
            }`}>
              {BAND_SYMBOL[v]}
            </div>
            <span className={`text-[9px] mt-0.5 ${isSelected ? (isA ? 'text-indigo-400' : 'text-amber-400') : 'text-zinc-700'}`}>{v}</span>
          </div>
        );
      })}
    </div>
  );
}

function CopyableBlock({ label, text }) {
  if (!text) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <CopyButton text={text} />
      </div>
      <pre className="text-sm text-zinc-300 whitespace-pre-wrap bg-zinc-900 rounded px-3 py-2 leading-relaxed font-sans">{text}</pre>
    </div>
  );
}

function parseInteractionChunk(chunk) {
  let prompt = '';
  const promptM = chunk.match(/Prompt:\s*\n([\s\S]*?)(?=\nAnswers:|$)/i);
  if (promptM) prompt = promptM[1].trim();

  const ansM = chunk.match(/Answers:\s*\n([\s\S]*)/i);
  if (!ansM) return { prompt, q1: '', q2: '', q3: '', q4: '', ratings: {}, q12: '', q13: '' };
  const ans = '\n' + ansM[1];

  function extractText(n, nextN) {
    const np = nextN != null ? `(?=\\nQ${nextN}[^\\d])` : '';
    const re = new RegExp(`\\nQ${n}[^:]*:\\s*\\n([\\s\\S]*?)${np}`, 'i');
    const m = ans.match(re);
    return m ? m[1].trim() : '';
  }

  function extractInline(n) {
    const m = ans.match(new RegExp(`\\nQ${n}:\\s*([AB][1-4])`, 'i'));
    return m ? m[1].toUpperCase() : '';
  }

  const ratings = {};
  for (let q = 5; q <= 11; q++) {
    const v = extractInline(q);
    if (v) ratings[q] = v;
  }

  return {
    prompt,
    q1: extractText(1, 2),
    q2: extractText(2, 3),
    q3: extractText(3, 4),
    q4: extractText(4, 5),
    ratings,
    q12: extractText(12, 13),
    q13: extractInline(13),
  };
}

function parseInteractions(rawText) {
  const re = /(?:^|\n)Interaction\s+(\d+)\s*\n/g;
  const matches = [...rawText.matchAll(re)];
  if (!matches.length) return [];
  return matches.map((match, i) => {
    const start = match.index + match[0].length;
    const end   = i + 1 < matches.length ? matches[i + 1].index : rawText.length;
    return { num: parseInt(match[1], 10), ...parseInteractionChunk(rawText.slice(start, end)) };
  });
}

function InteractionCard({ interaction }) {
  const { num, prompt, q1, q2, q3, q4, ratings, q12, q13 } = interaction;
  return (
    <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
      <div className="bg-zinc-700/50 px-4 py-2.5 border-b border-zinc-700">
        <h3 className="font-semibold text-zinc-100">Interaction {num}</h3>
      </div>
      <div className="p-4 space-y-4">
        <CopyableBlock label="Prompt" text={prompt} />
        <div className="space-y-3">
          <CopyableBlock label="Q1 — Model A did well" text={q1} />
          <CopyableBlock label="Q2 — Model A could improve" text={q2} />
          <CopyableBlock label="Q3 — Model B did well" text={q3} />
          <CopyableBlock label="Q4 — Model B could improve" text={q4} />
        </div>
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Ratings (A ← → B)</p>
          {[5, 6, 7, 8, 9, 10, 11].map((q) => (
            <div key={q} className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-500 w-5">Q{q}</span>
              <BandDisplay value={ratings[q] || ''} />
              {ratings[q] && <CopyButton text={ratings[q]} />}
            </div>
          ))}
        </div>
        <CopyableBlock label="Q12 — Justification" text={q12} />
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-500 w-6">Q13</span>
          <BandDisplay value={q13} />
          {q13 && <CopyButton text={q13} />}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   STEP 3 — PROMPTS
════════════════════════════════════════════════════ */
function Prompts({ onPrev }) {
  const [rawText,      setRawText]      = useState('');
  const [interactions, setInteractions] = useState([]);

  useEffect(() => {
    setRawText(lsGet('prbot_prompts_raw', ''));
    setInteractions(lsGet('prbot_prompts_parsed', []));
  }, []);

  useEffect(() => lsSet('prbot_prompts_raw',    rawText),      [rawText]);
  useEffect(() => lsSet('prbot_prompts_parsed', interactions), [interactions]);

  function parse() {
    setInteractions(parseInteractions(rawText));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Step 3 — Prompts</h2>

      <InfoBox>
        <p>
          Paste the full interaction data from your HFI session and click{' '}
          <strong>Parse Interactions</strong>. Each interaction becomes a copy-ready section.
        </p>
        <ul className="list-disc list-inside ml-2 space-y-1 text-xs text-indigo-300">
          <li>Q1–Q4: text answers — each block has its own copy button.</li>
          <li>Q5–Q11 and Q13: the selected rating is highlighted on the A ← → B band.</li>
          <li>Q12: justification text — copy-ready block.</li>
        </ul>
      </InfoBox>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Interaction data</label>
        <textarea
          className="w-full px-3 py-2 rounded border border-zinc-700 bg-zinc-900 text-xs font-mono text-zinc-300 resize-y leading-relaxed"
          rows={14}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={"Interaction 1\nPrompt:\n\n...\n\nAnswers:\n\nQ1 (Model A did well):\n...\nQ5: A3\n...\nQ13: A3"}
        />
      </div>

      <button
        onClick={parse}
        disabled={!rawText.trim()}
        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded text-sm font-medium"
      >
        Parse Interactions
      </button>

      {interactions.length > 0 && (
        <div className="space-y-5">
          <p className="text-xs text-zinc-500">{interactions.length} interaction{interactions.length !== 1 ? 's' : ''} parsed</p>
          {interactions.map((ia) => (
            <InteractionCard key={ia.num} interaction={ia} />
          ))}
        </div>
      )}

      <StepNav onPrev={onPrev} />
    </div>
  );
}

/* ════════════════════════════════════════════════════
   ADMIN — USERS
════════════════════════════════════════════════════ */
function UsersAdmin() {
  const [users, setUsers]     = useState([]);
  const [busy, setBusy]       = useState(false);

  async function load() {
    try { const d = await api.getUsers(); setUsers(d.users); } catch {}
  }

  useEffect(() => { load(); }, []);

  async function act(fn) {
    setBusy(true);
    try { await fn(); await load(); } catch {}
    setBusy(false);
  }

  const STATUS_COLOR = { approved: 'text-green-400', pending: 'text-yellow-400', rejected: 'text-red-400' };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Users</h2>

      <InfoBox>
        <p>Manage user accounts. Approve pending registrations, revoke access, or remove users.</p>
        <p className="text-xs text-indigo-400 mt-1">The first registered account is automatically made admin and approved.</p>
      </InfoBox>

      {users.length === 0 && (
        <p className="text-sm text-zinc-500">No users found.</p>
      )}

      {users.map((u) => (
        <div key={u.id} className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-zinc-200 truncate">{u.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">{u.role}</span>
              <span className={`text-xs font-medium ${STATUS_COLOR[u.status]}`}>{u.status}</span>
            </div>
            <div className="text-xs text-zinc-500 truncate">{u.email}</div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {u.status === 'pending' && (
              <>
                <button
                  onClick={() => act(() => api.approveUser(u.id))}
                  disabled={busy}
                  className="px-3 py-1 text-xs rounded bg-green-800 hover:bg-green-700 text-green-200 disabled:opacity-50 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => act(() => api.rejectUser(u.id))}
                  disabled={busy}
                  className="px-3 py-1 text-xs rounded bg-red-900 hover:bg-red-800 text-red-300 disabled:opacity-50 transition-colors"
                >
                  Reject
                </button>
              </>
            )}
            {u.status === 'approved' && (
              <button
                onClick={() => act(() => api.rejectUser(u.id))}
                disabled={busy}
                className="px-3 py-1 text-xs rounded bg-zinc-700 hover:bg-red-900 text-zinc-400 hover:text-red-300 disabled:opacity-50 transition-colors"
              >
                Revoke
              </button>
            )}
            {u.status === 'rejected' && (
              <button
                onClick={() => act(() => api.approveUser(u.id))}
                disabled={busy}
                className="px-3 py-1 text-xs rounded bg-zinc-700 hover:bg-green-800 text-zinc-400 hover:text-green-300 disabled:opacity-50 transition-colors"
              >
                Re-approve
              </button>
            )}
            <button
              onClick={() => act(() => api.deleteUser(u.id))}
              disabled={busy}
              className="px-3 py-1 text-xs rounded bg-zinc-700 hover:bg-red-900 text-zinc-400 hover:text-red-300 disabled:opacity-50 transition-colors"
              title="Delete user"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
