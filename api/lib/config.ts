import type { PermissionProfile } from './types';

export const APP_NAME = 'Wholesale Sales Management & SOA System';
export const APP_VERSION = '1.0.0-vercel';
export const TIMEZONE = 'Asia/Manila';

export const ROLE_PERMISSIONS: Record<string, PermissionProfile> = {
  Admin: {
    tabs: ['summarySection', 'encodeSection', 'soaSection', 'agingSection', 'settingsSection', 'accountSection'],
    canEditSummary: true,
    canEncode: true,
    canCancel: true,
    canExport: true,
    canResetSample: true,
    canAdminReset: true,
    canResetOtherPasswords: true,
  },
  Encoder: {
    tabs: ['summarySection', 'encodeSection', 'soaSection', 'agingSection'],
    canEditSummary: true,
    canEncode: true,
    canCancel: false,
    canExport: true,
    canResetSample: false,
    canAdminReset: false,
    canResetOtherPasswords: false,
  },
  Reviewer: {
    tabs: ['summarySection', 'soaSection', 'agingSection'],
    canEditSummary: false,
    canEncode: false,
    canCancel: true,
    canExport: true,
    canResetSample: false,
    canAdminReset: false,
    canResetOtherPasswords: false,
  },
  Viewer: {
    tabs: ['summarySection', 'soaSection', 'agingSection'],
    canEditSummary: false,
    canEncode: false,
    canCancel: false,
    canExport: true,
    canResetSample: false,
    canAdminReset: false,
    canResetOtherPasswords: false,
  },
};

export function getRolePermissions(role: string): PermissionProfile {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.Viewer;
}

export function mergePermissions(role: string, overrides: Record<string, unknown> = {}): PermissionProfile {
  const base = getRolePermissions(role);
  const merged = { ...base };

  if (Array.isArray(overrides.tabs)) {
    merged.tabs = overrides.tabs as string[];
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (key === 'tabs') continue;
    if (typeof value === 'boolean' && key in merged) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }

  return merged;
}
