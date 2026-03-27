const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  checkIssue: (url, standardId, customContext) =>
    apiFetch('/api/issues/check', {
      method: 'POST',
      body: JSON.stringify({ url, standardId, customContext }),
    }),

  getHistory: () => apiFetch('/api/issues/history'),

  deleteHistory: (id) => apiFetch(`/api/issues/history/${id}`, { method: 'DELETE' }),

  getStandards: () => apiFetch('/api/standards'),

  createStandard: (data) =>
    apiFetch('/api/standards', { method: 'POST', body: JSON.stringify(data) }),

  updateStandard: (id, data) =>
    apiFetch(`/api/standards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteStandard: (id) => apiFetch(`/api/standards/${id}`, { method: 'DELETE' }),

  resetDefaults: () => apiFetch('/api/standards/reset-defaults', { method: 'POST' }),

  generateFollowUp: (notes) =>
    apiFetch('/api/prompts/followup', { method: 'POST', body: JSON.stringify({ notes }) }),

  getFinalPrompt: () => apiFetch('/api/prompts/final'),

  getSetupCommands: (repoUrl, baseSha, repoFolder) =>
    apiFetch('/api/setup/commands', {
      method: 'POST',
      body: JSON.stringify({ repoUrl, baseSha, repoFolder }),
    }),

  health: () => apiFetch('/api/health'),
};
