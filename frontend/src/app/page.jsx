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
  { id: 'Standards',       label: 'Standards' },
  { id: 'History',         label: 'History' },
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
      {/* Header */}
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

      {/* Content — all panels rendered but only active one is visible so state is never destroyed */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className={tab === 'Issue Checker'  ? '' : 'hidden'}><IssueChecker /></div>
        <div className={tab === 'Setup Commands' ? '' : 'hidden'}><SetupCommands /></div>
        <div className={tab === 'Prompts'        ? '' : 'hidden'}><Prompts /></div>
        <div className={tab === 'Standards'      ? '' : 'hidden'}><Standards /></div>
        <div className={tab === 'History'        ? '' : 'hidden'}><History /></div>
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
function IssueChecker() {
  const [url, setUrl]                   = useState('');
  const [customContext, setCustomContext] = useState('');
  const [selectedStd, setSelectedStd]   = useState('');
  const [standards, setStandards]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState('');

  useEffect(() => {
    setUrl(lsGet('prbot_issue_url', ''));
    setCustomContext(lsGet('prbot_custom_context', ''));
    setSelectedStd(lsGet('prbot_standard_id', ''));
    setResult(lsGet('prbot_issue_result', null));
    api.getStandards().then((d) => setStandards(d.standards)).catch(() => {});
  }, []);

  // persist on every change
  useEffect(() => lsSet('prbot_issue_url',      url),          [url]);
  useEffect(() => lsSet('prbot_custom_context', customContext), [customContext]);
  useEffect(() => lsSet('prbot_standard_id',    selectedStd),  [selectedStd]);
  useEffect(() => { if (result) lsSet('prbot_issue_result', result); }, [result]);

  async function handleCheck() {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.checkIssue(url.trim(), selectedStd || undefined, customContext);
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
        <p>Enter a GitHub issue URL to check if it meets the quality standards for this project.</p>
        <p>The bot will automatically verify:</p>
        <ul className="list-disc list-inside ml-2 space-y-0.5 text-indigo-300 text-xs">
          <li>Repository language is Python, JavaScript, or TypeScript</li>
          <li>Repository size is ≤ 200 MB</li>
          <li>Issue has a description (not just a title or a bare link)</li>
          <li>Issue is closed (a merged PR solution exists for comparison)</li>
          <li>The linked PR changed at least 4 files (non-trivial change)</li>
          <li>The description is primarily in English</li>
        </ul>
        <p className="text-xs text-indigo-400 mt-1">
          A <span className="text-green-400 font-medium">Good</span> result means you can proceed with this issue.
          A <span className="text-yellow-400 font-medium">Warning</span> means it may work but has concerns.
          A <span className="text-red-400 font-medium">Bad</span> result means you should pick a different issue.
        </p>
      </InfoBox>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">GitHub Issue URL</label>
          <input
            className="w-full px-3 py-2 rounded border text-sm"
            placeholder="https://github.com/owner/repo/issues/123"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
          />
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-zinc-400 mb-1">Standard</label>
            <select
              className="w-full px-3 py-2 rounded border text-sm bg-zinc-800 border-zinc-600"
              value={selectedStd}
              onChange={(e) => setSelectedStd(e.target.value)}
            >
              <option value="">Default (built-in)</option>
              {standards.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCheck}
            disabled={loading || !url.trim()}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded text-sm font-medium transition-colors"
          >
            {loading ? 'Checking…' : 'Check Issue'}
          </button>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Custom context{' '}
            <span className="text-zinc-500">(optional — appended to the generated first prompt)</span>
          </label>
          <textarea
            className="w-full px-3 py-2 rounded border text-sm resize-none"
            rows={2}
            placeholder="e.g. Focus on the async handling logic"
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded p-3 text-sm text-red-300">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Verdict card */}
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
              {result.issueData.language} · {result.issueData.state} ·{' '}
              Score: {result.score}%
              {result.issueData.prFilesChanged != null && ` · PR files changed: ${result.issueData.prFilesChanged}`}
            </div>
            <CriteriaList results={result.results} />
          </div>

          {/* First prompt is generated in Step 2 via the AI meta-prompt card */}
          <p className="text-xs text-indigo-400 border border-indigo-800 bg-indigo-950/30 rounded px-3 py-2">
            Go to <strong>Step 2 — Setup Commands</strong> to get the AI prompt that generates your first claude-hfi message.
          </p>
        </div>
      )}
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
        const val = d.prompt || d.template || '';
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
      const val = d.prompt || d.template || '';
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
      const val = d.prompt || d.template || '';
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

/* First prompt generator card — emerald */
function FirstPromptGeneratorCard() {
  function fillTemplate(template) {
    if (!template) return template;
    // Read fresh from localStorage each time so it reflects the latest Issue Checker result
    const result = lsGet('prbot_issue_result', null);
    const d = result?.issueData || {};
    return template
      .replace(/\{\{ISSUE_TITLE\}\}/g, d.title || '(not set — run Issue Checker first)')
      .replace(/\{\{REPO\}\}/g, d.owner && d.repo ? `${d.owner}/${d.repo}` : '(not set)')
      .replace(/\{\{LANGUAGE\}\}/g, d.language || '(not set)')
      .replace(/\{\{ISSUE_BODY\}\}/g, d.body || '(no body)');
  }

  return (
    <EditableAiCard
      step={null}
      title="Generate First Prompt for claude-hfi"
      subtitle="(paste into Claude AI to get your first prompt)"
      instruction={
        <>
          Copy this filled-in meta-prompt and paste it into <strong>Claude.ai</strong> (or any Claude interface).
          Claude will generate the first prompt you should send to the model in your claude-hfi session.
          If placeholders show &quot;(not set)&quot;, go to Step 1 and run the Issue Checker first.
        </>
      }
      lsKey="prbot_first_prompt_template"
      getFn={api.getFirstPromptTemplate}
      updateFn={api.updateFirstPromptTemplate}
      resetFn={api.resetFirstPromptTemplate}
      resetMsg="Reset to the default first-prompt template?"
      accentColor="emerald"
      renderContent={fillTemplate}
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
function CcAgenticCard() {
  const text = 'cc_agentic_coding';
  return (
    <div className="rounded-lg border border-sky-700 bg-sky-950/25 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-sky-300">
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

function SetupCommands() {
  const [repoUrl,     setRepoUrl]     = useState('');
  const [baseSha,     setBaseSha]     = useState('');
  const [repoFolder,  setRepoFolder]  = useState('');
  const [commands,    setCommands]    = useState([]);
  const [headCommit,  setHeadCommit]  = useState('');
  const [issueResult, setIssueResult] = useState(null);
  const [issueUrl,    setIssueUrl]    = useState('');

  useEffect(() => {
    setRepoUrl(lsGet('prbot_setup_repo_url', ''));
    setBaseSha(lsGet('prbot_setup_base_sha', ''));
    setRepoFolder(lsGet('prbot_setup_folder', ''));
    setCommands(lsGet('prbot_setup_commands', []));
    setHeadCommit(lsGet('prbot_head_commit', ''));
    setIssueResult(lsGet('prbot_issue_result', null));
    setIssueUrl(lsGet('prbot_issue_url', ''));
  }, []);

  useEffect(() => lsSet('prbot_setup_repo_url',  repoUrl),    [repoUrl]);
  useEffect(() => lsSet('prbot_setup_base_sha',  baseSha),    [baseSha]);
  useEffect(() => lsSet('prbot_setup_folder',    repoFolder), [repoFolder]);
  useEffect(() => lsSet('prbot_setup_commands',  commands),   [commands]);
  useEffect(() => lsSet('prbot_head_commit',     headCommit), [headCommit]);

  const effectiveRepoUrl =
    issueResult?.issueData?.owner && issueResult?.issueData?.repo
      ? `https://github.com/${issueResult.issueData.owner}/${issueResult.issueData.repo}`
      : repoUrl;

  async function generate() {
    const d = await api.getSetupCommands(repoUrl, baseSha, repoFolder);
    setCommands(d.commands);
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
          <li>Launch claude-hfi in VS Code mode, then type <code className="bg-sky-950/40 px-1 rounded">cc_agentic_coding</code>.</li>
          <li className="text-emerald-300">
            <strong>Copy the first-prompt meta-prompt</strong> into Claude.ai to generate your opening message.
          </li>
        </ol>
        <p className="text-xs text-indigo-400 mt-1">
          Blue = shell commands · Violet = Dockerfile AI prompt · Teal = SHA to save · Emerald = first-prompt generator · Sky = agentic mode
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
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Local folder name</label>
          <input className="w-full px-3 py-2 rounded border text-sm" placeholder="my-repo" value={repoFolder} onChange={(e) => setRepoFolder(e.target.value)} />
        </div>
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

          {/* Step 6: git log */}
          <GitLogCard step={6} />

          {/* HEAD commit SHA input */}
          <HeadCommitCard value={headCommit} onChange={setHeadCommit} />

          {/* First prompt generator (emerald) — reads issue data from localStorage */}
          <FirstPromptGeneratorCard />

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

          {/* cc_agentic_coding */}
          <CcAgenticCard />

          {/* Quick reference */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Quick Reference — copy as needed</p>
            <CopyInfoCard label="GitHub Repository URL" value={effectiveRepoUrl} />
            <CopyInfoCard label="GitHub Issue URL" value={issueUrl} />
            <CopyInfoCard label="Initial Setup Commit SHA" value={headCommit} note="Required by Revelo — paste this into the platform" />
          </div>

          {/* Remaining backend commands (steps 9+) */}
          {commands.slice(6).map((c, i) => (
            <ShellCommandCard key={`tail-${i}`} step={9 + i} label={c.label} cmd={c.cmd} note={c.note} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   STEP 3 — PROMPTS
════════════════════════════════════════════════════ */
function Prompts() {
  const [followUpNotes,  setFollowUpNotes]  = useState('');
  const [followUpPrompt, setFollowUpPrompt] = useState('');
  const [finalPrompt,    setFinalPrompt]    = useState('');

  useEffect(() => {
    setFollowUpNotes(lsGet('prbot_followup_notes', ''));
    setFollowUpPrompt(lsGet('prbot_followup_prompt', ''));
    setFinalPrompt(lsGet('prbot_final_prompt', ''));
  }, []);

  useEffect(() => lsSet('prbot_followup_notes',  followUpNotes),  [followUpNotes]);
  useEffect(() => lsSet('prbot_followup_prompt', followUpPrompt), [followUpPrompt]);
  useEffect(() => lsSet('prbot_final_prompt',    finalPrompt),    [finalPrompt]);

  async function genFollowUp() {
    const d = await api.generateFollowUp(followUpNotes);
    setFollowUpPrompt(d.prompt);
  }

  async function genFinal() {
    const d = await api.getFinalPrompt();
    setFinalPrompt(d.prompt);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Step 3 — Prompts</h2>

      <InfoBox>
        <p>
          Use this tab <strong>during your claude-hfi session</strong>, after you've sent the first
          prompt (generated in Step 2) and reviewed the model's response.
        </p>
        <ul className="list-disc list-inside ml-2 space-y-1 text-xs text-indigo-300">
          <li>
            <strong>Follow-up prompt</strong> — Use this after each model response that still needs work.
            Write your review notes (what was wrong, what's missing) and generate a PR-style comment.
            Minimum 3 meaningful interactions are required.
          </li>
          <li>
            <strong>Final prompt</strong> — Use this only when the solution is production-ready.
            It asks the model to commit all remaining changes before you exit.
          </li>
        </ul>
        <p className="text-xs text-indigo-400 mt-1">
          Remember: pause the Revelo timer every time you send a prompt and the model is running.
          Resume it once the model finishes and you start your review.
        </p>
      </InfoBox>

      {/* Follow-up */}
      <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 space-y-3">
        <div>
          <h3 className="font-medium text-zinc-200">Follow-up / PR Review Prompt</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Describe what the model got wrong or what's still missing. Leave blank for a generic
            PR review template.
          </p>
        </div>
        <textarea
          className="w-full px-3 py-2 rounded border text-sm resize-none"
          rows={4}
          placeholder="e.g. The error handling is missing for the case where the response is empty. The variable name 'x' should be more descriptive. Tests don't cover the edge case when the input is null."
          value={followUpNotes}
          onChange={(e) => setFollowUpNotes(e.target.value)}
        />
        <button
          onClick={genFollowUp}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium"
        >
          Generate Follow-up Prompt
        </button>

        {followUpPrompt && (
          <div className="space-y-2 mt-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-zinc-300">Generated prompt</span>
              <div className="flex items-center gap-2">
                <SavedLabel show />
                <CopyButton text={followUpPrompt} />
              </div>
            </div>
            <PromptInstruction>
              Copy this and paste it as your next message in the claude-hfi interface.
              Treat it as a PR review comment — it should focus on issues with the
              current code, not request new features or expand the scope.
              Do <strong>not</strong> add system-level instructions.
            </PromptInstruction>
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans bg-zinc-900 rounded p-3 leading-relaxed">
              {followUpPrompt}
            </pre>
          </div>
        )}
      </div>

      {/* Final prompt */}
      <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 space-y-3">
        <div>
          <h3 className="font-medium text-zinc-200">Final Prompt — ask model to commit</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Use this only when you're satisfied the solution is production-ready.
          </p>
        </div>
        <button
          onClick={genFinal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium"
        >
          Get Final Prompt
        </button>

        {finalPrompt && (
          <div className="space-y-2 mt-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-zinc-300">Generated prompt</span>
              <div className="flex items-center gap-2">
                <SavedLabel show />
                <CopyButton text={finalPrompt} />
              </div>
            </div>
            <PromptInstruction>
              Send this as your <strong>last message</strong> to the model before exiting
              the HFI tool. After the model commits, press <kbd className="bg-zinc-700 px-1 rounded">Ctrl+C</kbd> in
              the tmux terminal to end the session. Then compress the repo with{' '}
              <code className="bg-zinc-700 px-1 rounded text-xs">tar cf final_result.tar &lt;repo-folder&gt;</code>{' '}
              and upload it to the Revelo platform.
            </PromptInstruction>
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans bg-zinc-900 rounded p-3 leading-relaxed">
              {finalPrompt}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   STANDARDS
════════════════════════════════════════════════════ */
function Standards() {
  const [data, setData] = useState({ standards: [], defaultCriteria: [] });
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const d = await api.getStandards();
    setData(d);
  }

  useEffect(() => { load(); }, []);

  async function createFromDefaults() {
    if (!newName.trim()) return;
    await api.createStandard({ name: newName.trim(), criteria: data.defaultCriteria, isDefault: false });
    setNewName('');
    setMsg('Standard created.');
    load();
  }

  async function deleteStd(id) {
    await api.deleteStandard(id);
    load();
  }

  async function resetDefaults() {
    await api.resetDefaults();
    setMsg('Defaults reset.');
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Standards</h2>
        <button
          onClick={resetDefaults}
          className="text-xs px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded"
        >
          Reset to defaults
        </button>
      </div>

      <InfoBox>
        <p>
          Standards define the criteria used to evaluate GitHub issues in Step 1.
          The built-in default criteria cover all requirements from the PR Writer guidelines.
        </p>
        <p className="text-xs text-indigo-300">
          You can save a copy of the defaults under a custom name to create your own standard.
          Custom standards can then be selected in the Issue Checker dropdown.
          Use <strong>Reset to defaults</strong> if you've changed something and want to start over.
        </p>
      </InfoBox>

      {msg && <div className="text-sm text-green-400">{msg}</div>}

      <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
        <h3 className="font-medium text-zinc-200 mb-3">Built-in Criteria</h3>
        <ul className="space-y-2">
          {data.defaultCriteria.map((c) => (
            <li key={c.key} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="text-indigo-400 text-xs font-mono w-5">W{c.weight}</span>
                <span className="text-zinc-200">{c.label}</span>
              </div>
              <p className="text-xs text-zinc-500 ml-7">{c.description}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 rounded border text-sm"
          placeholder="New standard name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          onClick={createFromDefaults}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium"
        >
          Save as Standard
        </button>
      </div>

      {data.standards.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-zinc-300 text-sm">Saved Standards</h3>
          {data.standards.map((s) => (
            <div
              key={s._id}
              className="bg-zinc-800 rounded p-3 border border-zinc-700 flex items-center justify-between"
            >
              <span className="text-sm text-zinc-200">
                {s.name}{' '}
                {s.isDefault && <span className="text-xs text-indigo-400">(default)</span>}
              </span>
              <button
                onClick={() => deleteStd(s._id)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   HISTORY
════════════════════════════════════════════════════ */
function History() {
  const [history, setHistory] = useState([]);

  async function load() {
    const d = await api.getHistory();
    setHistory(d);
  }

  useEffect(() => { load(); }, []);

  async function del(id) {
    await api.deleteHistory(id);
    load();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Check History</h2>

      <InfoBox>
        <p>
          All issue evaluations you've run in Step 1 are saved here automatically.
          Use this to revisit past results, check which issues you've already evaluated,
          or compare verdicts across different issues.
        </p>
      </InfoBox>

      {history.length === 0 && (
        <p className="text-sm text-zinc-500">No checks yet. Run an issue check in Step 1.</p>
      )}

      {history.map((h) => (
        <div key={h._id} className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-zinc-200 truncate max-w-xs">
              {h.title || h.url}
            </span>
            <div className="flex items-center gap-2">
              <VerdictBadge verdict={h.verdict} />
              <button
                onClick={() => del(h._id)}
                className="text-xs text-zinc-500 hover:text-red-400"
                title="Delete record"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            {h.owner}/{h.repo} · {h.language} · Score: {h.score}% ·{' '}
            {new Date(h.createdAt).toLocaleString()}
          </div>
          {h.results && <CriteriaList results={h.results} />}
        </div>
      ))}
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
