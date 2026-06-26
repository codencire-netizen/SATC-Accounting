import { getSupabase } from '../lib/supabase';
import { nowManila, decodeJson } from '../lib/helpers';
import type { AuditLog } from '../lib/types';

export async function insertAuditEntry(entry: {
  action: string;
  invNo?: string;
  customer?: string;
  actor?: string;
  detail?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  fields?: string[];
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const supabase = getSupabase();
  const now = nowManila();

  const { error } = await supabase
    .from('audit_log')
    .insert({
      action: entry.action,
      inv_no: entry.invNo || '',
      customer: entry.customer || '',
      actor: entry.actor || '',
      detail: entry.detail || '',
      before_json: entry.before || null,
      after_json: entry.after || null,
      fields_json: entry.fields || null,
      entity_type: entry.entityType || '',
      entity_id: entry.entityId || '',
      created_at: now,
    });

  if (error) throw error;
}

export async function getAuditLog(limit = 200): Promise<AuditLog[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
