import { getSupabase } from '../lib/supabase';
import type { Account } from '../lib/types';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  return computedHash === hash;
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<Account | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) return null;

  const isValid = await verifyPassword(password, data.password_hash);
  if (!isValid) return null;

  return data;
}

export function generateToken(user: Account): string {
  const payload = {
    sub: String(user.id),
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  };

  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = btoa('dummy-signature');

  return `${header}.${body}.${signature}`;
}
