import { getSupabase } from '../lib/supabase';
import { nowManila } from '../lib/helpers';
import type { Customer } from '../lib/types';

export async function getCustomerProfiles(): Promise<Customer[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function upsertCustomerProfiles(profiles: Record<string, unknown>[]): Promise<void> {
  const supabase = getSupabase();
  const now = nowManila();

  const { error: deleteError } = await supabase
    .from('customers')
    .delete()
    .neq('id', 0);

  if (deleteError) throw deleteError;

  if (profiles.length === 0) return;

  const rows = profiles.map((profile) => ({
    name: String(profile.name || profile.customer || ''),
    payload_json: profile,
    updated_at: now,
    updated_by: 'System',
  }));

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('customers')
      .insert(batch);

    if (error) throw error;
  }
}
