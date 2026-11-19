// ============================================================
//  AssetCore Pro — API client for the MySQL backend
//  Backend: Express + MySQL, running at http://localhost:5000
//  (This replaces the old Firebase Realtime Database data layer.)
// ============================================================

const API_BASE = 'http://localhost:5000/api';

function authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: authHeaders(options.headers || {})
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty / non-JSON body */ }
  if (!res.ok) {
    const err = new Error((data && (data.message || data.error)) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ---------- Auth ----------
export const loginUser = (identifier, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email: identifier, password }) });

export const registerUser = (payload) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });

export const getTechnicians = async () => {
  try { return await request('/auth/technicians'); }
  catch (err) { console.error('Error fetching technicians:', err); return []; }
};

// ---------- Users ----------
export const getUsers = () => request('/users');
export const createUser = (payload) =>
  request('/users', { method: 'POST', body: JSON.stringify(payload) });
export const updateUser = (id, payload) =>
  request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteUser = (id) =>
  request(`/users/${id}`, { method: 'DELETE' });

// ---------- Assets (service tasks) ----------
export const getAssets = () => request('/assets');
export const createAsset = (payload) =>
  request('/assets', { method: 'POST', body: JSON.stringify(payload) });
export const updateAsset = (id, payload) =>
  request(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const updateAssetStatus = async (id, status) => {
  try { await updateAsset(id, { status }); return true; }
  catch (err) { console.error('Error updating status:', err); return false; }
};
export const deleteAsset = (id) =>
  request(`/assets/${id}`, { method: 'DELETE' });

// ---------- Tickets ----------
export const getTickets = () => request('/tickets');
export const createTicket = (payload) =>
  request('/tickets', { method: 'POST', body: JSON.stringify(payload) });
export const updateTicket = (id, payload) =>
  request(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteTicket = (id) =>
  request(`/tickets/${id}`, { method: 'DELETE' });

// ---------- Categories ----------
export const getCategories = () => request('/categories');
export const createCategory = (payload) =>
  request('/categories', { method: 'POST', body: JSON.stringify(payload) });
export const deleteCategory = (id) =>
  request(`/categories/${id}`, { method: 'DELETE' });

// ---------- Devices ----------
export const getDevices = () => request('/devices');
export const createDevice = (payload) =>
  request('/devices', { method: 'POST', body: JSON.stringify(payload) });
export const updateDevice = (id, payload) =>
  request(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteDevice = (id) =>
  request(`/devices/${id}`, { method: 'DELETE' });

// ---------- Audit ----------
export const getAuditLogs = () => request('/audit');
export const createAuditLog = (action) =>
  request('/audit', { method: 'POST', body: JSON.stringify({ action }) });

export default API_BASE;
