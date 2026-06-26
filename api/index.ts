import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jsonResponse, nowManila, ApiError } from './lib/helpers';
import { APP_VERSION } from './lib/config';
import { getSupabase } from './lib/supabase';
import { getSettings } from './modules/settings';

import { handleAuth } from './routes/auth';
import { handleTransactions } from './routes/transactions';
import { handleCustomers } from './routes/customers';
import { handleAccounts } from './routes/accounts';
import { handleSettings } from './routes/settings';
import { handleAudit } from './routes/audit';
import { handleBackups } from './routes/backups';
import { handleNotifications } from './routes/notifications';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const url = new URL(req.url || '/', `https://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method || 'GET';

    if (method === 'GET' && path === '/api/health') {
      const supabase = getSupabase();
      const { error } = await supabase.from('accounts').select('id').limit(1);
      
      jsonResponse(res, {
        ok: true,
        db: error ? 'disconnected' : 'connected',
        schemaVersion: 1,
        version: APP_VERSION,
        time: nowManila(),
      });
      return;
    }

    if (method === 'GET' && path === '/api/meta') {
      const supabase = getSupabase();
      
      const [accounts, transactions, customers, auditLog, settings] = await Promise.all([
        supabase.from('accounts').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('audit_log').select('id', { count: 'exact', head: true }),
        getSettings(),
      ]);

      jsonResponse(res, {
        ok: true,
        accounts: accounts.count || 0,
        transactions: transactions.count || 0,
        customers: customers.count || 0,
        auditLog: auditLog.count || 0,
        settings,
      });
      return;
    }

    if (path.startsWith('/api/auth')) {
      await handleAuth(req, res);
      return;
    }

    if (path.startsWith('/api/transactions')) {
      await handleTransactions(req, res);
      return;
    }

    if (path.startsWith('/api/customers')) {
      await handleCustomers(req, res);
      return;
    }

    if (path.startsWith('/api/accounts')) {
      await handleAccounts(req, res);
      return;
    }

    if (path === '/api/settings') {
      await handleSettings(req, res);
      return;
    }

    if (path.startsWith('/api/audit')) {
      await handleAudit(req, res);
      return;
    }

    if (path.startsWith('/api/backups')) {
      await handleBackups(req, res);
      return;
    }

    if (path.startsWith('/api/notifications')) {
      await handleNotifications(req, res);
      return;
    }

    jsonResponse(res, {
      message: 'Not found.',
      code: 'ERR_NOT_FOUND',
      path,
      method,
    }, 404);
  } catch (error) {
    if (error instanceof ApiError) {
      jsonResponse(res, {
        message: error.message,
        code: error.code,
      }, error.status);
      return;
    }

    console.error('API Error:', error);
    jsonResponse(res, {
      message: 'Internal server error.',
      code: 'ERR_SERVER_ERROR',
    }, 500);
  }
}
