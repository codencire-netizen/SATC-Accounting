import { getSupabase } from '../lib/supabase';
import type { Settings } from '../lib/types';

export async function getSettings(): Promise<Record<string, unknown>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('settings')
    .select('payload_json')
    .eq('id', 1)
    .single();

  if (error || !data) return {};
  return data.payload_json || {};
}

export async function storeSettings(
  payload: Record<string, unknown>,
  updatedBy = 'System'
): Promise<Record<string, unknown>> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('settings')
    .upsert({
      id: 1,
      payload_json: payload,
      updated_by: updatedBy,
    });

  if (error) throw error;
  return payload;
}
