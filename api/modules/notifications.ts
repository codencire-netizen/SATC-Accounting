import { getSupabase } from '../lib/supabase';
import { nowManila } from '../lib/helpers';
import type { Notification } from '../lib/types';

export async function getNotifications(): Promise<Notification[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function markNotificationsRead(ids: number[]): Promise<void> {
  const supabase = getSupabase();
  const now = nowManila();

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: now })
    .in('id', ids);

  if (error) throw error;
}
