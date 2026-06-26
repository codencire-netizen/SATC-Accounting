import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuditLog } from '../modules/audit';
import { insertAuditEntry } from '../modules/audit';

export async function handleAudit(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    const log = await getAuditLog();
    res.status(200).json(log);
    return;
  }

  if (req.method === 'POST') {
    const entry = req.body || {};
    if (!entry.action) {
      res.status(400).json({ message: 'Action is required.', code: 'ERR_VALIDATION' });
      return;
    }

    await insertAuditEntry(entry);
    res.status(201).json({ message: 'Audit entry created.' });
    return;
  }
}
