'use client';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import VerdictBadge from '../components/VerdictBadge';
import CriteriaList from '../components/CriteriaList';
import CopyButton from '../components/CopyButton';

const TABS = ['Issue Checker', 'Prompts', 'Setup Commands', 'Standards', 'History'];

export default function Home() {
  const [tab, setTab] = useState('Issue Checker');
  const [backendUrl, setBackendUrl] = useState('');
  const [connected, setConnected] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('backendUrl');
    if (stored) setBackendUrl(stored);
    checkHealth(stored || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
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
    setBackendUrl(url);
    localStorage.setItem('backendUrl', url);
    // Override env at runtime by patching fetch base — simplest approach is a page reload
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-700 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-indigo-400">PR Bot</h1>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${connected === true ? 'bg-green-800 text-green-300' : connected === false ? 'bg-red-800 text-red-300' : 'bg-zinc-700 text-zinc-400'}`}>
            {connected === true ? 'Backend connected' : connected === false ? 'Backend offline' : 'Checking...'}
          </span>
          <input
            className="text-xs px-2 py-1 rounded border w-56"
            placeholder="Backend URL (e.g. http://192.168.1.x:3001)"
            defaultValue={backendUrl}
            onBlur={(e) => e.target.value !== backendUrl && saveBackendUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveBackendUrl(e.target.value)}
          />
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-zinc-900 border-b border-zinc-700 px-6 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {tab === 'Issue Checker' && <IssueChecker />}
        {tab === 'Prompts' && <Prompts />}
        {tab === 'Setup Commands' && <SetupCommands />}
        {tab === 'Standards' && <Standards />}
        {tab === 'History' && <History />}
      </main>
    </div>
  );
}

/* ─────────────────────────── Issue Checker ─────────────────────────── */
function IssueChecker() {
  const [url, setUrl] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [standards, setStandards] = useState([]);
  const [selectedStd, setSelectedStd] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStandards().then((d) => setStandards(d.standards)).catch(() => {});
  }, []);

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
      <h2 className="text-xl font-semibold">Issue Checker</h2>

      <div className="space-y-3">
        <label className="block text-sm text-zinc-400">GitHub Issue URL</label>
        <input
          className="w-full px-3 py-2 rounded border text-sm"
          placeholder="https://github.com/owner/repo/issues/123"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
        />

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
            {loading ? 'Checking...' : 'Check Issue'}
          </button>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Custom context (optional — appended to first prompt)</label>
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
          {/* Verdict */}
          <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-zinc-200">{result.issueData.title}</span>
              <VerdictBadge verdict={result.verdict} />
            </div>
            <div className="text-xs text-zinc-400 mb-1">
              {result.issueData.owner}/{result.issueData.repo} #{result.issueData.issueNumber} ·{' '}
              {result.issueData.language} · {result.issueData.state} ·{' '}
              Score: {result.score}%
              {result.issueData.prFilesChanged != null && ` · PR files: ${result.issueData.prFilesChanged}`}
            </div>
            <CriteriaList results={result.results} />
          </div>

          {/* Generated first prompt */}
          <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-zinc-200 text-sm">Generated First Prompt</span>
              <CopyButton text={result.firstPrompt} />
            </div>
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{result.firstPrompt}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Prompts ─────────────────────────── */
function Prompts() {
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpPrompt, setFollowUpPrompt] = useState('');
  const [finalPrompt, setFinalPrompt] = useState('');

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
      <h2 className="text-xl font-semibold">Prompt Generator</h2>

      <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 space-y-3">
        <h3 className="font-medium text-zinc-200">Follow-up / PR Review Prompt</h3>
        <p className="text-xs text-zinc-400">Enter your review notes (what the model missed or did wrong). Leave blank for a generic template.</p>
        <textarea
          className="w-full px-3 py-2 rounded border text-sm resize-none"
          rows={4}
          placeholder="e.g. The error handling is missing for the case where the response is empty. Also the variable name 'x' should be more descriptive."
          value={followUpNotes}
          onChange={(e) => setFollowUpNotes(e.target.value)}
        />
        <button onClick={genFollowUp} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium">
          Generate Follow-up Prompt
        </button>
        {followUpPrompt && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-zinc-400">Result</span>
              <CopyButton text={followUpPrompt} />
            </div>
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans bg-zinc-900 rounded p-3 leading-relaxed">{followUpPrompt}</pre>
          </div>
        )}
      </div>

      <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 space-y-3">
        <h3 className="font-medium text-zinc-200">Final Prompt (ask model to commit)</h3>
        <button onClick={genFinal} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium">
          Get Final Prompt
        </button>
        {finalPrompt && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-zinc-400">Result</span>
              <CopyButton text={finalPrompt} />
            </div>
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans bg-zinc-900 rounded p-3">{finalPrompt}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Setup Commands ─────────────────────────── */
function SetupCommands() {
  const [repoUrl, setRepoUrl] = useState('');
  const [baseSha, setBaseSha] = useState('');
  const [repoFolder, setRepoFolder] = useState('');
  const [commands, setCommands] = useState([]);

  async function generate() {
    const d = await api.getSetupCommands(repoUrl, baseSha, repoFolder);
    setCommands(d.commands);
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Setup Commands</h2>
      <p className="text-sm text-zinc-400">Fill in the details below and get the commands you need to run (these are for you to copy and run — the bot never executes them).</p>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Repository URL</label>
          <input className="w-full px-3 py-2 rounded border text-sm" placeholder="https://github.com/owner/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Base SHA (from spreadsheet)</label>
          <input className="w-full px-3 py-2 rounded border text-sm font-mono" placeholder="abc1234" value={baseSha} onChange={(e) => setBaseSha(e.target.value)} />
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
          {commands.map((c, i) => (
            <div key={i} className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-zinc-300">{c.label}</span>
                <CopyButton text={c.cmd} />
              </div>
              <code className="block text-sm font-mono text-indigo-300 bg-zinc-900 rounded px-3 py-2 break-all">{c.cmd}</code>
              {c.note && <p className="text-xs text-zinc-500 mt-1">{c.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Standards ─────────────────────────── */
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
    setMsg('Standard created');
    load();
  }

  async function deleteStd(id) {
    await api.deleteStandard(id);
    load();
  }

  async function resetDefaults() {
    await api.resetDefaults();
    setMsg('Defaults reset');
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Standards</h2>
        <button onClick={resetDefaults} className="text-xs px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded">Reset to defaults</button>
      </div>
      {msg && <div className="text-sm text-green-400">{msg}</div>}

      <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
        <h3 className="font-medium text-zinc-200 mb-3">Built-in Criteria</h3>
        <ul className="space-y-1">
          {data.defaultCriteria.map((c) => (
            <li key={c.key} className="text-sm text-zinc-300 flex items-center gap-2">
              <span className="text-indigo-400 w-4">W{c.weight}</span>
              <span>{c.label}</span>
              <span className="text-zinc-500 text-xs">— {c.description}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        <input className="flex-1 px-3 py-2 rounded border text-sm" placeholder="New standard name..." value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button onClick={createFromDefaults} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium">
          Save as Standard
        </button>
      </div>

      {data.standards.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-zinc-300 text-sm">Saved Standards</h3>
          {data.standards.map((s) => (
            <div key={s._id} className="bg-zinc-800 rounded p-3 border border-zinc-700 flex items-center justify-between">
              <span className="text-sm text-zinc-200">{s.name} {s.isDefault && <span className="text-xs text-indigo-400">(default)</span>}</span>
              <button onClick={() => deleteStd(s._id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── History ─────────────────────────── */
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
      {history.length === 0 && <p className="text-sm text-zinc-500">No checks yet.</p>}
      {history.map((h) => (
        <div key={h._id} className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-zinc-200 truncate max-w-xs">{h.title || h.url}</span>
            <div className="flex items-center gap-2">
              <VerdictBadge verdict={h.verdict} />
              <button onClick={() => del(h._id)} className="text-xs text-zinc-500 hover:text-red-400">✕</button>
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            {h.owner}/{h.repo} · {h.language} · {new Date(h.createdAt).toLocaleString()}
          </div>
          {h.results && <CriteriaList results={h.results} />}
        </div>
      ))}
    </div>
  );
}
