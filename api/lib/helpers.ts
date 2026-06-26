import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ROLE_PERMISSIONS, mergePermissions } from './config';
import type { PublicAccount, PermissionProfile } from './types';

export function nowManila(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T');
}

export function jsonResponse(res: VercelResponse, payload: unknown, status = 200): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.status(status).json(payload);
}

export function readJsonBody(req: VercelRequest): Record<string, unknown> {
  const body = req.body;
  if (!body || typeof body !== 'object') return {};
  return body;
}

export function normalizeStr(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

export function publicAccount(row: Record<string, unknown>): PublicAccount {
  const role = String(row.role || 'Viewer');
  const accessSource = row.access_json || row.access || {};
  const access = typeof accessSource === 'string'
    ? JSON.parse(accessSource || '{}')
    : (accessSource as Record<string, unknown>) || {};

  const effective = mergePermissions(role, access);

  return {
    id: Number(row.id || 0),
    username: String(row.username || ''),
    fullName: String(row.full_name || row.fullName || ''),
    role,
    access: effective,
    department: String(row.department || 'Accounting'),
    email: String(row.email || ''),
    status: String(row.status || 'Active'),
    notes: String(row.notes || ''),
    forcePasswordChange: Boolean(row.force_password_change ?? row.forcePasswordChange ?? false),
    createdAt: String(row.created_at || ''),
    createdBy: String(row.created_by || 'System'),
    updatedAt: String(row.updated_at || ''),
    updatedBy: String(row.updated_by || 'System'),
    lastLogin: String(row.last_login_at || ''),
    source: 'supabase',
  };
}

export function decodeJson(value: unknown, defaultValue: Record<string, unknown> = {}): Record<string, unknown> {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'object') return value as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(value));
    return typeof parsed === 'object' && parsed !== null ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function encodeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return 'null';
  }
}

export interface AuthUser {
  userId: string;
  username: string;
  role: string;
}

export function extractAuthUser(req: VercelRequest): AuthUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const payload = JSON.parse(Buffer.from(authHeader.slice(7).split('.')[1], 'base64').toString());
    return {
      userId: payload.sub || payload.userId || '',
      username: payload.username || '',
      role: payload.role || 'Viewer',
    };
  } catch {
    return null;
  }
}

export function requireAuth(req: VercelRequest, allowedRoles?: string[]): AuthUser {
  const user = extractAuthUser(req);
  if (!user) {
    throw new ApiError(401, 'Login required.', 'ERR_UNAUTHORIZED');
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new ApiError(403, 'Access denied.', 'ERR_FORBIDDEN');
  }

  return user;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
