import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTransactionsList, replaceTransactions } from '../modules/transactions';
import { insertAuditEntry } from '../modules/audit';

export async function handleTransactions(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    const transactions = await getTransactionsList();
    res.status(200).json(transactions);
    return;
  }

  if (req.method === 'POST') {
    const { transactions } = req.body || {};
    if (!Array.isArray(transactions)) {
      res.status(400).json({ message: 'transactions array is required.', code: 'ERR_VALIDATION' });
      return;
    }

    await replaceTransactions(transactions);

    await insertAuditEntry({
      action: 'Bulk Replace Transactions',
      detail: `Replaced ${transactions.length} transactions`,
    });

    res.status(200).json({ message: 'Transactions replaced.', count: transactions.length });
    return;
  }
}
