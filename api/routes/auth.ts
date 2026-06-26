import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase';
import { nowManila } from '../lib/helpers';
import { authenticateUser, generateToken } from '../modules/auth';
import { updateLastLogin } from '../modules/accounts';
import { insertAuditEntry } from '../modules/audit';

export async function handleAuth(req: VercelRequest, res: VercelResponse): Promise<void> {
  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  const path = url.pathname;

  if (req.method === 'POST' && path === '/api/auth/login') {
    const { username, password } = req.body || {};

    if (!username || !password) {
      res.status(400).json({ message: 'Username and password are required.', code: 'ERR_VALIDATION' });
      return;
    }

    const user = await authenticateUser(String(username), String(password));
    if (!user) {
      res.status(401).json({ message: 'Invalid username or password.', code: 'ERR_UNAUTHORIZED' });
      return;
    }

    await updateLastLogin(user.id!);
    const token = generateToken(user);

    await insertAuditEntry({
      action: 'Login',
      actor: user.full_name,
      detail: `User ${user.username} logged in`,
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        department: user.department,
        email: user.email,
        status: user.status,
        forcePasswordChange: user.force_password_change,
      },
    });
    return;
  }

  if (req.method === 'POST' && path === '/api/auth/logout') {
    res.status(200).json({ message: 'Logged out.' });
    return;
  }

  if (req.method === 'GET' && path === '/api/auth/me') {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Login required.', code: 'ERR_UNAUTHORIZED' });
      return;
    }

    try {
      const payload = JSON.parse(Buffer.from(authHeader.slice(7).split('.')[1], 'base64').toString());
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', Number(payload.sub))
        .single();

      if (error || !data) {
        res.status(401).json({ message: 'Login required.', code: 'ERR_UNAUTHORIZED' });
        return;
      }

      res.status(200).json({
        id: data.id,
        username: data.username,
        fullName: data.full_name,
        role: data.role,
        department: data.department,
        email: data.email,
        status: data.status,
      });
    } catch {
      res.status(401).json({ message: 'Login required.', code: 'ERR_UNAUTHORIZED' });
    }
    return;
  }
}
