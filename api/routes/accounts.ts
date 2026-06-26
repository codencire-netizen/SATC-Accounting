import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAccountRows, createAccountRow, updateAccountRow, deleteAccountRow } from '../modules/accounts';
import { insertAuditEntry } from '../modules/audit';
import { publicAccount } from '../lib/helpers';

export async function handleAccounts(req: VercelRequest, res: VercelResponse): Promise<void> {
  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  const pathMatch = url.pathname.match(/\/api\/accounts\/(\d+)/);
  const accountId = pathMatch ? Number(pathMatch[1]) : null;

  if (req.method === 'GET' && !accountId) {
    const accounts = await getAccountRows();
    res.status(200).json(accounts.map(publicAccount));
    return;
  }

  if (req.method === 'GET' && accountId) {
    const account = await getAccountRows();
    const found = account.find(a => a.id === accountId);
    if (!found) {
      res.status(404).json({ message: 'Account not found.', code: 'ERR_NOT_FOUND' });
      return;
    }
    res.status(200).json(publicAccount(found));
    return;
  }

  if (req.method === 'POST') {
    const { username, fullName, password, role, department, email, status, access, forcePasswordChange, notes } = req.body || {};

    if (!username || !fullName || !password) {
      res.status(400).json({ message: 'Username, full name, and password are required.', code: 'ERR_VALIDATION' });
      return;
    }

    const newAccount = await createAccountRow({
      username: String(username),
      fullName: String(fullName),
      password: String(password),
      role: String(role || 'Viewer'),
      department: String(department || 'Accounting'),
      email: String(email || ''),
      status: String(status || 'Active'),
      access: access || {},
      forcePasswordChange: forcePasswordChange ?? true,
      notes: String(notes || ''),
    });

    await insertAuditEntry({
      action: 'Account Created',
      actor: String(fullName),
      detail: `Created account ${username} with role ${role || 'Viewer'}`,
    });

    res.status(201).json(publicAccount(newAccount));
    return;
  }

  if (req.method === 'PUT' && accountId) {
    const { fullName, role, password, department, email, status, access, forcePasswordChange, notes } = req.body || {};

    const updated = await updateAccountRow(accountId, {
      fullName: fullName ? String(fullName) : undefined,
      role: role ? String(role) : undefined,
      password: password ? String(password) : undefined,
      department: department ? String(department) : undefined,
      email: email ? String(email) : undefined,
      status: status ? String(status) : undefined,
      access,
      forcePasswordChange,
      notes: notes !== undefined ? String(notes) : undefined,
    });

    await insertAuditEntry({
      action: 'Account Updated',
      detail: `Updated account ${updated.username}`,
    });

    res.status(200).json(publicAccount(updated));
    return;
  }

  if (req.method === 'DELETE' && accountId) {
    await deleteAccountRow(accountId);
    await insertAuditEntry({
      action: 'Account Deleted',
      detail: `Deleted account ID ${accountId}`,
    });
    res.status(200).json({ message: 'Account deleted.' });
    return;
  }
}
