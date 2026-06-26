import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getBackupHistory, createBackupEntry, pruneOldBackups } from '../modules/backups';
import { getTransactionsList } from '../modules/transactions';

export async function handleBackups(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    const history = await getBackupHistory();
    res.status(200).json(history);
    return;
  }

  if (req.method === 'POST') {
    const transactions = await getTransactionsList();
    const recordCount = transactions.length;

    const statusCounts = transactions.reduce((acc, tx) => {
      const status = String(tx.status || '').toUpperCase();
      if (status) acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('-');

    const filename = `wholesale-sales-backup-${timestamp}.json`;

    const backup = await createBackupEntry({
      filename,
      recordCount,
      overdueCount: statusCounts.PASTDUE || 0,
      cancelledCount: statusCounts.CANCELLED || 0,
      payload: { transactions, statusCounts },
    });

    await pruneOldBackups();

    res.status(201).json({
      message: 'Backup created.',
      backup: {
        id: backup.id,
        filename,
        recordCount,
        statusCounts,
      },
    });
    return;
  }
}
