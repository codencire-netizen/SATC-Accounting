import { getSupabase } from '../lib/supabase';
import { nowManila } from '../lib/helpers';
import type { Backup } from '../lib/types';

export async function getBackupHistory(): Promise<Backup[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('backups')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return data || [];
}

export async function createBackupEntry(backup: {
  filename: string;
  recordCount: number;
  overdueCount: number;
  cancelledCount: number;
  warningText?: string;
  payload: Record<string, unknown>;
}): Promise<Backup> {
  const supabase = getSupabase();
  const now = nowManila();

  const { data, error } = await supabase
    .from('backups')
    .insert({
      filename: backup.filename,
      record_count: backup.recordCount,
      overdue_count: backup.overdueCount,
      cancelled_count: backup.cancelledCount,
      warning_text: backup.warningText || null,
      payload_json: backup.payload,
      created_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function pruneOldBackups(maxAgeDays = 30, maxCount = 30): Promise<void> {
  const supabase = getSupabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  const cutoffStr = cutoffDate.toISOString();

  await supabase
    .from('backups')
    .delete()
    .lt('created_at', cutoffStr);

  const { data: remaining } = await supabase
    .from('backups')
    .select('id')
    .order('created_at', { ascending: false });

  if (remaining && remaining.length > maxCount) {
    const idsToDelete = remaining.slice(maxCount).map(b => b.id);
    await supabase
      .from('backups')
      .delete()
      .in('id', idsToDelete);
  }
}
