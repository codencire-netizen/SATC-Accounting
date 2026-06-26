const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function supabaseQuery(table, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal' };
  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

function json(res, data, status = 200) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(status).json(data);
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method || 'GET';

  try {
    if (method === 'GET' && path === '/api/health') {
      let dbStatus = 'no-config';
      if (SUPABASE_URL && SUPABASE_KEY) {
        try { await supabaseQuery('accounts?select=id&limit=1'); dbStatus = 'connected'; } catch { dbStatus = 'error'; }
      }
      return json(res, { ok: true, db: dbStatus, version: '1.0.0' });
    }

    if (method === 'POST' && path === '/api/auth/login') {
      if (!SUPABASE_URL) return json(res, { error: 'Database not configured' }, 503);
      const { username, password } = req.body || {};
      if (!username || !password) return json(res, { error: 'Username and password required' }, 400);
      const users = await supabaseQuery(`accounts?username=eq.${encodeURIComponent(username.toLowerCase().trim())}&select=*`);
      const user = users[0];
      if (!user) return json(res, { error: 'Invalid username or password' }, 401);
      if (user.password_hash !== hashPassword(password) && user.password_hash !== password) return json(res, { error: 'Invalid username or password' }, 401);
      if (user.status === 'Disabled') return json(res, { error: 'Account is disabled' }, 403);
      await supabaseQuery(`accounts?id=eq.${user.id}`, 'PATCH', { last_login_at: new Date().toISOString() }).catch(() => {});
      return json(res, { token: 'local-' + user.id, account: { id: user.id, username: user.username, fullName: user.full_name, role: user.role, department: user.department, email: user.email, status: user.status, access: user.access_json, forcePasswordChange: user.force_password_change, profileImage: user.profile_image || '' } });
    }

    if (method === 'GET' && path === '/api/accounts') {
      if (!SUPABASE_URL) return json(res, []);
      const data = await supabaseQuery('accounts?select=*&order=full_name');
      return json(res, data.map(u => ({ id: u.id, username: u.username, fullName: u.full_name, role: u.role, department: u.department, email: u.email, status: u.status, access: u.access_json, forcePasswordChange: u.force_password_change, profileImage: u.profile_image || '', createdAt: u.created_at, updatedAt: u.updated_at, lastLogin: u.last_login_at })));
    }

    if (method === 'POST' && path === '/api/accounts') {
      if (!SUPABASE_URL) return json(res, { error: 'Database not configured' }, 503);
      const b = req.body || {};
      const data = await supabaseQuery('accounts', 'POST', { username: b.username, full_name: b.fullName, role: b.role || 'Viewer', password_hash: hashPassword(b.password), access_json: b.access || {}, department: b.department || 'Accounting', email: b.email || '', status: b.status || 'Active', notes: b.notes || '', force_password_change: b.forcePasswordChange ?? true, profile_image: b.profileImage || '' });
      return json(res, { id: data[0] && data[0].id, username: data[0] && data[0].username }, 201);
    }

    if (method === 'DELETE' && path.startsWith('/api/accounts/')) {
      if (!SUPABASE_URL) return json(res, { error: 'Database not configured' }, 503);
      const id = path.split('/').pop();
      await supabaseQuery(`accounts?id=eq.${id}`, 'DELETE');
      return json(res, { ok: true });
    }

    if (method === 'PUT' && path.startsWith('/api/accounts/')) {
      if (!SUPABASE_URL) return json(res, { error: 'Database not configured' }, 503);
      const id = path.split('/').pop();
      const b = req.body || {};
      const update = { updated_at: new Date().toISOString() };
      if (b.fullName !== undefined) update.full_name = b.fullName;
      if (b.role !== undefined) update.role = b.role;
      if (b.status !== undefined) update.status = b.status;
      if (b.email !== undefined) update.email = b.email;
      if (b.department !== undefined) update.department = b.department;
      if (b.access !== undefined) update.access_json = b.access;
      if (b.password !== undefined) update.password_hash = hashPassword(b.password);
      if (b.profileImage !== undefined) update.profile_image = b.profileImage;
      if (b.forcePasswordChange !== undefined) update.force_password_change = b.forcePasswordChange;
      await supabaseQuery(`accounts?id=eq.${id}`, 'PATCH', update);
      return json(res, { ok: true });
    }

    if (path === '/api/transactions' || path.startsWith('/api/transactions/')) {
      if (!SUPABASE_URL) return json(res, []);
      if (method === 'GET') { const data = await supabaseQuery('transactions?order=created_at.desc&limit=500'); return json(res, data); }
      if (method === 'POST') { const data = await supabaseQuery('transactions', 'POST', req.body); return json(res, data[0], 201); }
      if (method === 'PUT') { const id = path.split('/').pop(); await supabaseQuery(`transactions?id=eq.${id}`, 'PATCH', req.body); return json(res, { ok: true }); }
      if (method === 'DELETE') { const id = path.split('/').pop(); await supabaseQuery(`transactions?id=eq.${id}`, 'DELETE'); return json(res, { ok: true }); }
    }

    if (path === '/api/customers') {
      if (!SUPABASE_URL) return json(res, []);
      const data = await supabaseQuery('customers?select=*&order=name');
      return json(res, data);
    }

    if (path === '/api/audit') {
      if (!SUPABASE_URL) return json(res, []);
      if (method === 'POST') { await supabaseQuery('audit_log', 'POST', req.body).catch(() => {}); return json(res, { ok: true }); }
      const data = await supabaseQuery('audit_log?order=created_at.desc&limit=500');
      return json(res, data);
    }

    if (path === '/api/settings') {
      if (!SUPABASE_URL) return json(res, {});
      if (method === 'GET') { const data = await supabaseQuery('settings?id=eq.1&select=payload_json'); return json(res, data[0] && data[0].payload_json || {}); }
      if (method === 'POST' || method === 'PUT') { await supabaseQuery('settings', 'POST', { id: 1, payload_json: req.body, updated_at: new Date().toISOString() }); return json(res, { ok: true }); }
    }

    return json(res, { message: 'Not found', path }, 404);
  } catch (err) {
    console.error('API Error:', err);
    return json(res, { error: err.message || 'Internal server error' }, 500);
  }
};
