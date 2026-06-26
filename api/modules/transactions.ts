import { getSupabase } from '../lib/supabase';
import { nowManila } from '../lib/helpers';
import type { Transaction } from '../lib/types';

export async function getTransactionsList(): Promise<Transaction[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('invoice_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function replaceTransactions(transactions: Record<string, unknown>[]): Promise<void> {
  const supabase = getSupabase();
  const now = nowManila();

  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .neq('id', 0);

  if (deleteError) throw deleteError;

  if (transactions.length === 0) return;

  const rows = transactions.map((tx, index) => ({
    inv_no: String(tx.invNo || tx.invoice_no || `TX-${index}`),
    customer: String(tx.customer || tx.customer_name || ''),
    invoice_date: tx.date || tx.invoice_date || null,
    due_date: tx.dueDate || tx.due_date || null,
    status: String(tx.status || 'NOTDUE').toUpperCase(),
    receivable: Number(tx.receivable || 0),
    payload_json: tx,
    created_at: now,
    updated_at: now,
  }));

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('transactions')
      .insert(batch);

    if (error) throw error;
  }
}

export async function getTransactionsByCustomer(customer: string): Promise<Transaction[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('customer', customer)
    .order('invoice_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateTransaction(
  invNo: string,
  updates: Record<string, unknown>
): Promise<Transaction | null> {
  const supabase = getSupabase();
  const now = nowManila();

  const { data, error } = await supabase
    .from('transactions')
    .update({
      payload_json: updates,
      status: String(updates.status || 'NOTDUE').toUpperCase(),
      receivable: Number(updates.receivable || 0),
      updated_at: now,
    })
    .eq('inv_no', invNo)
    .select()
    .single();

  if (error) return null;
  return data;
}
