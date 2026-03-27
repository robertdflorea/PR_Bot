function getBase() {
  let url = '';
  if (typeof window !== 'undefined') {
    url = localStorage.getItem('backendUrl') || '';
  }
  if (!url) url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500';
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) url = 'http://' + url;
  return url;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('prbot_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${getBase()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

async function apiFetchForm(path, formData) {
  const token = getToken();
  const res = await fetch(`${getBase()}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  /* ─── Auth ─── */
  register: (name, email, password) =>
    apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),

  login: (email, password) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getMe: () => apiFetch('/api/auth/me'),

  updateMe: (data) =>
    apiFetch('/api/auth/me', { method: 'PUT', body: JSON.stringify(data) }),

  changePassword: (currentPassword, newPassword) =>
    apiFetch('/api/auth/me/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),

  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return apiFetchForm('/api/auth/me/avatar', fd);
  },

  /* ─── Admin: user management ─── */
  getUsers: () => apiFetch('/api/auth/users'),

  approveUser: (id) => apiFetch(`/api/auth/users/${id}/approve`, { method: 'POST' }),

  rejectUser: (id) => apiFetch(`/api/auth/users/${id}/reject`, { method: 'POST' }),

  deleteUser: (id) => apiFetch(`/api/auth/users/${id}`, { method: 'DELETE' }),

  /* ─── Existing ─── */
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

  getDockerfilePrompt: () => apiFetch('/api/settings/dockerfile-prompt'),

  updateDockerfilePrompt: (prompt) =>
    apiFetch('/api/settings/dockerfile-prompt', {
      method: 'PUT',
      body: JSON.stringify({ prompt }),
    }),

  resetDockerfilePrompt: () =>
    apiFetch('/api/settings/dockerfile-prompt/reset', { method: 'POST' }),

  getFirstPromptTemplate: () => apiFetch('/api/settings/first-prompt-generator'),

  updateFirstPromptTemplate: (template) =>
    apiFetch('/api/settings/first-prompt-generator', {
      method: 'PUT',
      body: JSON.stringify({ template }),
    }),

  resetFirstPromptTemplate: () =>
    apiFetch('/api/settings/first-prompt-generator/reset', { method: 'POST' }),

  getWorkflowGuide: () => apiFetch('/api/settings/workflow-guide'),

  updateWorkflowGuide: (guide) =>
    apiFetch('/api/settings/workflow-guide', { method: 'PUT', body: JSON.stringify({ guide }) }),

  resetWorkflowGuide: () =>
    apiFetch('/api/settings/workflow-guide/reset', { method: 'POST' }),
};
