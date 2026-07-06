const crypto = require('crypto');

// ============ CONFIGURATION ============
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ALLOWED_ORIGINS = ['https://satc-accounting-qnpc.vercel.app', 'http://localhost:3000'];
const MAX_BODY_SIZE = 1024 * 1024; // 1MB
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // requests per window
const LOGIN_RATE_LIMIT_MAX = 5; // login attempts per window
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// ============ IN-MEMORY STORES ============
const rateLimitStore = new Map();
const loginAttempts = new Map();
const lockedAccounts = new Map();

// ============ SECURITY FUNCTIONS ============
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>'"&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '&': '&amp;' }[c] || c));
}

function validateId(id) {
  return /^\d+$/.test(id) && parseInt(id) > 0 && parseInt(id) < 1000000;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip) || { count: 0, reset: now + RATE_LIMIT_WINDOW };
  if (now > record.reset) {
    rateLimitStore.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

function checkLoginRateLimit(username) {
  const now = Date.now();
  const key = username.toLowerCase();
  const locked = lockedAccounts.get(key);
  if (locked && now < locked.until) return { allowed: false, retryAfter: Math.ceil((locked.until - now) / 1000) };
  if (locked && now >= locked.until) lockedAccounts.delete(key);
  const record = loginAttempts.get(key) || { count: 0, reset: now + RATE_LIMIT_WINDOW };
  if (now > record.reset) {
    loginAttempts.set(key, { count: 1, reset: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  if (record.count >= LOGIN_RATE_LIMIT_MAX) {
    lockedAccounts.set(key, { until: now + LOCKOUT_DURATION });
    loginAttempts.delete(key);
    return { allowed: false, retryAfter: LOCKOUT_DURATION / 1000 };
  }
  record.count++;
  return { allowed: true };
}

function resetLoginAttempts(username) {
  loginAttempts.delete(username.toLowerCase());
}

async function supabaseQuery(table, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal' };
  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

function json(res, data, status = 200) {
  const origin = res.req?.headers?.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.status(status).json(data);
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function logRequest(req, status) {
  const ip = getClientIp(req);
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.url} - ${status} - IP:${ip}`);
}

// ============ MAIN HANDLER ============
module.exports = async (req, res) => {
  // HTTPS enforcement
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.VERCEL_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  // Rate limiting
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    logRequest(req, 429);
    return json(res, { error: 'Too many requests. Please try again later.' }, 429);
  }

  // Body size limit
  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > MAX_BODY_SIZE) {
      logRequest(req, 413);
      return json(res, { error: 'Request body too large.' }, 413);
    }
  }

  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method || 'GET';

  try {
    // Health check (no auth required)
    if (method === 'GET' && path === '/api/health') {
      let dbStatus = 'no-config';
      if (SUPABASE_URL && SUPABASE_KEY) {
        try { await supabaseQuery('accounts?select=id&limit=1'); dbStatus = 'connected'; } catch { dbStatus = 'error'; }
      }
      logRequest(req, 200);
      return json(res, { ok: true, db: dbStatus, version: '1.0.0' });
    }

    // Login with rate limiting and lockout
    if (method === 'POST' && path === '/api/auth/login') {
      if (!SUPABASE_URL) return json(res, { error: 'Service unavailable' }, 503);
      const { username, password } = req.body || {};
      if (!username || !password) {
        logRequest(req, 400);
        return json(res, { error: 'Authentication failed' }, 400);
      }
      const cleanUsername = sanitizeInput(String(username).toLowerCase().trim());
      const rateCheck = checkLoginRateLimit(cleanUsername);
      if (!rateCheck.allowed) {
        logRequest(req, 429);
        return json(res, { error: 'Account temporarily locked. Try again later.', retryAfter: rateCheck.retryAfter }, 429);
      }
      const users = await supabaseQuery(`accounts?username=eq.${encodeURIComponent(cleanUsername)}&select=*`);
      const user = users[0];
      if (!user || !constantTimeCompare(user.password_hash || '', hashPassword(password))) {
        logRequest(req, 401);
        return json(res, { error: 'Authentication failed' }, 401);
      }
      if (user.status === 'Disabled') {
        logRequest(req, 403);
        return json(res, { error: 'Account is disabled' }, 403);
      }
      resetLoginAttempts(cleanUsername);
      await supabaseQuery(`accounts?id=eq.${user.id}`, 'PATCH', { last_login_at: new Date().toISOString() }).catch(() => {});
      logRequest(req, 200);
      return json(res, { token: 'local-' + user.id, account: { id: user.id, username: user.username, fullName: user.full_name, role: user.role, department: user.department, email: user.email, status: user.status, access: user.access_json, forcePasswordChange: user.force_password_change, profileImage: user.profile_image || '' } });
    }

    // All other endpoints require Supabase
    if (!SUPABASE_URL) return json(res, { error: 'Service unavailable' }, 503);

    // List accounts (read-only, no auth needed for demo)
    if (method === 'GET' && path === '/api/accounts') {
      const data = await supabaseQuery('accounts?select=*&order=full_name');
      logRequest(req, 200);
      return json(res, data.map(u => ({ id: u.id, username: u.username, fullName: u.full_name, role: u.role, department: u.department, email: u.email, status: u.status, access: u.access_json, forcePasswordChange: u.force_password_change, profileImage: u.profile_image || '', createdAt: u.created_at, updatedAt: u.updated_at, lastLogin: u.last_login_at })));
    }

    // Create account (admin only - check token)
    if (method === 'POST' && path === '/api/accounts') {
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      if (!token.startsWith('local-')) {
        logRequest(req, 401);
        return json(res, { error: 'Authentication required' }, 401);
      }
      const accountId = token.replace('local-', '');
      if (!validateId(accountId)) {
        logRequest(req, 400);
        return json(res, { error: 'Invalid token' }, 400);
      }
      const admins = await supabaseQuery(`accounts?id=eq.${accountId}&select=role`);
      if (!admins[0] || !['Admin', 'President'].includes(admins[0].role)) {
        logRequest(req, 403);
        return json(res, { error: 'Insufficient permissions' }, 403);
      }
      const b = req.body || {};
      if (!b.username || !b.password || !b.fullName) {
        logRequest(req, 400);
        return json(res, { error: 'Username, password, and full name required' }, 400);
      }
      const data = await supabaseQuery('accounts', 'POST', { username: sanitizeInput(b.username), full_name: sanitizeInput(b.fullName), role: b.role || 'Viewer', password_hash: hashPassword(b.password), access_json: b.access || {}, department: b.department || 'Accounting', email: sanitizeInput(b.email || ''), status: b.status || 'Active', notes: sanitizeInput(b.notes || ''), force_password_change: b.forcePasswordChange ?? true, profile_image: b.profileImage || '' });
      logRequest(req, 201);
      return json(res, { id: data[0] && data[0].id, username: data[0] && data[0].username }, 201);
    }

    // Delete account (admin only)
    if (method === 'DELETE' && path.startsWith('/api/accounts/')) {
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      if (!token.startsWith('local-')) {
        logRequest(req, 401);
        return json(res, { error: 'Authentication required' }, 401);
      }
      const accountId = token.replace('local-', '');
      if (!validateId(accountId)) {
        logRequest(req, 400);
        return json(res, { error: 'Invalid token' }, 400);
      }
      const admins = await supabaseQuery(`accounts?id=eq.${accountId}&select=role`);
      if (!admins[0] || !['Admin', 'President'].includes(admins[0].role)) {
        logRequest(req, 403);
        return json(res, { error: 'Insufficient permissions' }, 403);
      }
      const id = path.split('/').pop();
      if (!validateId(id)) {
        logRequest(req, 400);
        return json(res, { error: 'Invalid account ID' }, 400);
      }
      await supabaseQuery(`accounts?id=eq.${id}`, 'DELETE');
      logRequest(req, 200);
      return json(res, { ok: true });
    }

    // Update account (admin only)
    if (method === 'PUT' && path.startsWith('/api/accounts/')) {
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      if (!token.startsWith('local-')) {
        logRequest(req, 401);
        return json(res, { error: 'Authentication required' }, 401);
      }
      const accountId = token.replace('local-', '');
      if (!validateId(accountId)) {
        logRequest(req, 400);
        return json(res, { error: 'Invalid token' }, 400);
      }
      const admins = await supabaseQuery(`accounts?id=eq.${accountId}&select=role`);
      if (!admins[0] || !['Admin', 'President'].includes(admins[0].role)) {
        logRequest(req, 403);
        return json(res, { error: 'Insufficient permissions' }, 403);
      }
      const id = path.split('/').pop();
      if (!validateId(id)) {
        logRequest(req, 400);
        return json(res, { error: 'Invalid account ID' }, 400);
      }
      const b = req.body || {};
      const update = { updated_at: new Date().toISOString() };
      if (b.fullName !== undefined) update.full_name = sanitizeInput(b.fullName);
      if (b.role !== undefined) update.role = b.role;
      if (b.status !== undefined) update.status = b.status;
      if (b.email !== undefined) update.email = sanitizeInput(b.email);
      if (b.department !== undefined) update.department = sanitizeInput(b.department);
      if (b.access !== undefined) update.access_json = b.access;
      if (b.password !== undefined) update.password_hash = hashPassword(b.password);
      if (b.profileImage !== undefined) update.profile_image = b.profileImage;
      if (b.forcePasswordChange !== undefined) update.force_password_change = b.forcePasswordChange;
      await supabaseQuery(`accounts?id=eq.${id}`, 'PATCH', update);
      logRequest(req, 200);
      return json(res, { ok: true });
    }

    // Transactions (admin/president only for write)
    if (path === '/api/transactions' || path.startsWith('/api/transactions/')) {
      if (method === 'GET') {
        const data = await supabaseQuery('transactions?order=created_at.desc&limit=500');
        logRequest(req, 200);
        return json(res, data);
      }
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      if (!token.startsWith('local-')) {
        logRequest(req, 401);
        return json(res, { error: 'Authentication required' }, 401);
      }
      const accountId = token.replace('local-', '');
      if (!validateId(accountId)) {
        logRequest(req, 400);
        return json(res, { error: 'Invalid token' }, 400);
      }
      const users = await supabaseQuery(`accounts?id=eq.${accountId}&select=role`);
      if (!users[0] || !['Admin', 'President', 'Encoder'].includes(users[0].role)) {
        logRequest(req, 403);
        return json(res, { error: 'Insufficient permissions' }, 403);
      }
      if (method === 'POST') {
        const data = await supabaseQuery('transactions', 'POST', req.body);
        logRequest(req, 201);
        return json(res, data[0], 201);
      }
      if (method === 'PUT') {
        const id = path.split('/').pop();
        if (!validateId(id)) { logRequest(req, 400); return json(res, { error: 'Invalid ID' }, 400); }
        await supabaseQuery(`transactions?id=eq.${id}`, 'PATCH', req.body);
        logRequest(req, 200);
        return json(res, { ok: true });
      }
      if (method === 'DELETE') {
        const id = path.split('/').pop();
        if (!validateId(id)) { logRequest(req, 400); return json(res, { error: 'Invalid ID' }, 400); }
        await supabaseQuery(`transactions?id=eq.${id}`, 'DELETE');
        logRequest(req, 200);
        return json(res, { ok: true });
      }
    }

    // Customers (read-only)
    if (path === '/api/customers') {
      const data = await supabaseQuery('customers?select=*&order=name');
      logRequest(req, 200);
      return json(res, data);
    }

    // Audit log
    if (path === '/api/audit') {
      if (method === 'POST') {
        await supabaseQuery('audit_log', 'POST', req.body).catch(() => {});
        logRequest(req, 200);
        return json(res, { ok: true });
      }
      const data = await supabaseQuery('audit_log?order=created_at.desc&limit=500');
      logRequest(req, 200);
      return json(res, data);
    }

    // Settings (admin only for write)
    if (path === '/api/settings') {
      if (method === 'GET') {
        const data = await supabaseQuery('settings?id=eq.1&select=payload_json');
        logRequest(req, 200);
        return json(res, data[0] && data[0].payload_json || {});
      }
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      if (!token.startsWith('local-')) {
        logRequest(req, 401);
        return json(res, { error: 'Authentication required' }, 401);
      }
      const accountId = token.replace('local-', '');
      if (!validateId(accountId)) {
        logRequest(req, 400);
        return json(res, { error: 'Invalid token' }, 400);
      }
      const users = await supabaseQuery(`accounts?id=eq.${accountId}&select=role`);
      if (!users[0] || !['Admin', 'President'].includes(users[0].role)) {
        logRequest(req, 403);
        return json(res, { error: 'Insufficient permissions' }, 403);
      }
      await supabaseQuery('settings', 'POST', { id: 1, payload_json: req.body, updated_at: new Date().toISOString() });
      logRequest(req, 200);
      return json(res, { ok: true });
    }

    logRequest(req, 404);
    return json(res, { message: 'Not found' }, 404);
  } catch (err) {
    console.error('API Error:', err);
    logRequest(req, 500);
    return json(res, { error: 'Internal server error' }, 500);
  }
};
