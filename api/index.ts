import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function json(res: VercelResponse, data: any, status = 200) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(status).json(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method || 'GET';

  try {
    // Health check
    if (method === 'GET' && path === '/api/health') {
      const dbOk = supabase ? (await supabase.from('accounts').select('id').limit(1)).error === null : false;
      return json(res, { ok: true, db: dbOk ? 'connected' : 'no-config', version: '1.0.0', time: new Date().toISOString() });
    }

    // Auth login
    if (method === 'POST' && path === '/api/auth/login') {
      if (!supabase) return json(res, { error: 'Database not configured' }, 503);
      const { username, password } = req.body || {};
      if (!username || !password) return json(res, { error: 'Username and password required' }, 400);
      const { data, error } = await supabase.from('accounts').select('*').eq('username', username.toLowerCase().trim()).single();
      if (error || !data) return json(res, { error: 'Invalid username or password' }, 401);
      if (data.password_hash !== hashPassword(password) && data.password_hash !== password) return json(res, { error: 'Invalid username or password' }, 401);
      if (data.status === 'Disabled') return json(res, { error: 'Account is disabled' }, 403);
      await supabase.from('accounts').update({ last_login_at: new Date().toISOString() }).eq('id', data.id);
      return json(res, { token: 'local-' + data.id, account: { id: data.id, username: data.username, fullName: data.full_name, role: data.role, department: data.department, email: data.email, status: data.status, access: data.access_json, forcePasswordChange: data.force_password_change, profileImage: data.profile_image || '' } });
    }

    // List accounts
    if (method === 'GET' && path === '/api/accounts') {
      if (!supabase) return json(res, []);
      const { data, error } = await supabase.from('accounts').select('*').order('full_name');
      if (error) return json(res, { error: error.message }, 500);
      return json(res, (data || []).map((u: any) => ({ id: u.id, username: u.username, fullName: u.full_name, role: u.role, department: u.department, email: u.email, status: u.status, access: u.access_json, forcePasswordChange: u.force_password_change, profileImage: u.profile_image || '', createdAt: u.created_at, updatedAt: u.updated_at, lastLogin: u.last_login_at })));
    }

    // Create account
    if (method === 'POST' && path === '/api/accounts') {
      if (!supabase) return json(res, { error: 'Database not configured' }, 503);
      const b = req.body || {};
      const { data, error } = await supabase.from('accounts').insert({ username: b.username, full_name: b.fullName, role: b.role || 'Viewer', password_hash: hashPassword(b.password), access_json: b.access || {}, department: b.department || 'Accounting', email: b.email || '', status: b.status || 'Active', notes: b.notes || '', force_password_change: b.forcePasswordChange ?? true, profile_image: b.profileImage || '' }).select().single();
      if (error) return json(res, { error: error.message }, 500);
      return json(res, { id: data.id, username: data.username }, 201);
    }

    // Delete account
    if (method === 'DELETE' && path.startsWith('/api/accounts/')) {
      if (!supabase) return json(res, { error: 'Database not configured' }, 503);
      const id = path.split('/').pop();
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) return json(res, { error: error.message }, 500);
      return json(res, { ok: true });
    }

    // Update account
    if (method === 'PUT' && path.startsWith('/api/accounts/')) {
      if (!supabase) return json(res, { error: 'Database not configured' }, 503);
      const id = path.split('/').pop();
      const b = req.body || {};
      const update: any = {};
      if (b.fullName !== undefined) update.full_name = b.fullName;
      if (b.role !== undefined) update.role = b.role;
      if (b.status !== undefined) update.status = b.status;
      if (b.email !== undefined) update.email = b.email;
      if (b.department !== undefined) update.department = b.department;
      if (b.access !== undefined) update.access_json = b.access;
      if (b.password !== undefined) update.password_hash = hashPassword(b.password);
      if (b.profileImage !== undefined) update.profile_image = b.profileImage;
      if (b.forcePasswordChange !== undefined) update.force_password_change = b.forcePasswordChange;
      update.updated_at = new Date().toISOString();
      const { error } = await supabase.from('accounts').update(update).eq('id', id);
      if (error) return json(res, { error: error.message }, 500);
      return json(res, { ok: true });
    }

    // Transactions CRUD
    if (path === '/api/transactions' || path.startsWith('/api/transactions/')) {
      if (!supabase) return json(res, []);
      if (method === 'GET') {
        const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(500);
        return json(res, data || []);
      }
      if (method === 'POST') {
        const { data, error } = await supabase.from('transactions').insert(req.body).select().single();
        if (error) return json(res, { error: error.message }, 500);
        return json(res, data, 201);
      }
      if (method === 'PUT') {
        const id = path.split('/').pop();
        const { error } = await supabase.from('transactions').update(req.body).eq('id', id);
        if (error) return json(res, { error: error.message }, 500);
        return json(res, { ok: true });
      }
      if (method === 'DELETE') {
        const id = path.split('/').pop();
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) return json(res, { error: error.message }, 500);
        return json(res, { ok: true });
      }
    }

    // Customers
    if (path === '/api/customers' || path.startsWith('/api/customers/')) {
      if (!supabase) return json(res, []);
      const { data } = await supabase.from('customers').select('*').order('name');
      return json(res, data || []);
    }

    // Audit log
    if (path === '/api/audit' || path.startsWith('/api/audit/')) {
      if (!supabase) return json(res, []);
      if (method === 'POST') {
        const { error } = await supabase.from('audit_log').insert(req.body);
        if (error) console.warn('Audit log insert failed:', error.message);
        return json(res, { ok: true });
      }
      const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(500);
      return json(res, data || []);
    }

    // Settings
    if (path === '/api/settings') {
      if (!supabase) return json(res, {});
      if (method === 'GET') {
        const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
        return json(res, data?.payload_json || {});
      }
      if (method === 'POST' || method === 'PUT') {
        const { error } = await supabase.from('settings').upsert({ id: 1, payload_json: req.body, updated_at: new Date().toISOString() });
        if (error) return json(res, { error: error.message }, 500);
        return json(res, { ok: true });
      }
    }

    return json(res, { message: 'Not found', path }, 404);
  } catch (err: any) {
    console.error('API Error:', err);
    return json(res, { error: err.message || 'Internal server error' }, 500);
  }
}
