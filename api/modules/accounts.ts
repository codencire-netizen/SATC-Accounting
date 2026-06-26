import { getSupabase } from '../lib/supabase';
import { hashPassword, verifyPassword } from './auth_logic';
import { nowManila, publicAccount, mergePermissions } from '../lib/helpers';
import type { Account, PublicAccount } from '../lib/types';

export async function getAccountRows(): Promise<Account[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function findAccountRowByUsername(username: string): Promise<Account | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) return null;
  return data;
}

export async function findAccountRowById(id: number): Promise<Account | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function createAccountRow(payload: {
  username: string;
  fullName: string;
  role: string;
  password: string;
  department?: string;
  email?: string;
  status?: string;
  access?: Record<string, unknown>;
  forcePasswordChange?: boolean;
  notes?: string;
  createdBy?: string;
}): Promise<Account> {
  const supabase = getSupabase();

  const existing = await findAccountRowByUsername(payload.username);
  if (existing) {
    throw new Error('Username already exists.');
  }

  const passwordHash = await hashPassword(payload.password);
  const access = mergePermissions(payload.role, payload.access || {});
  const now = nowManila();

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      username: payload.username,
      full_name: payload.fullName,
      role: payload.role,
      password_hash: passwordHash,
      access_json: access,
      department: payload.department || 'Accounting',
      email: payload.email || '',
      status: payload.status || 'Active',
      notes: payload.notes || '',
      force_password_change: payload.forcePasswordChange ?? true,
      created_by: payload.createdBy || 'System',
      updated_by: payload.createdBy || 'System',
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAccountRow(
  id: number,
  payload: {
    fullName?: string;
    role?: string;
    password?: string;
    department?: string;
    email?: string;
    status?: string;
    access?: Record<string, unknown>;
    forcePasswordChange?: boolean;
    notes?: string;
    updatedBy?: string;
  }
): Promise<Account> {
  const supabase = getSupabase();
  const now = nowManila();
  const updateData: Record<string, unknown> = { updated_at: now };

  if (payload.fullName !== undefined) updateData.full_name = payload.fullName;
  if (payload.role !== undefined) updateData.role = payload.role;
  if (payload.department !== undefined) updateData.department = payload.department;
  if (payload.email !== undefined) updateData.email = payload.email;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.notes !== undefined) updateData.notes = payload.notes;
  if (payload.forcePasswordChange !== undefined) updateData.force_password_change = payload.forcePasswordChange;
  if (payload.updatedBy) updateData.updated_by = payload.updatedBy;

  if (payload.password) {
    updateData.password_hash = await hashPassword(payload.password);
  }

  if (payload.access !== undefined) {
    updateData.access_json = payload.access;
  }

  const { data, error } = await supabase
    .from('accounts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAccountRow(id: number): Promise<void> {
  const supabase = getSupabase();

  const account = await findAccountRowById(id);
  if (!account) throw new Error('Account not found.');

  if (account.role === 'Admin') {
    const accounts = await getAccountRows();
    const adminCount = accounts.filter(a => a.role === 'Admin').length;
    if (adminCount <= 1) {
      throw new Error('Cannot delete the last admin account.');
    }
  }

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateLastLogin(id: number): Promise<void> {
  const supabase = getSupabase();
  const now = nowManila();

  await supabase
    .from('accounts')
    .update({ last_login_at: now })
    .eq('id', id);
}
