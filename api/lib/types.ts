export interface Transaction {
  id?: number;
  inv_no: string;
  customer: string;
  invoice_date: string | null;
  due_date: string | null;
  status: string;
  receivable: number;
  payload_json: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id?: number;
  name: string;
  payload_json: Record<string, unknown>;
  updated_at?: string;
  updated_by?: string;
}

export interface Account {
  id?: number;
  username: string;
  full_name: string;
  role: string;
  password_hash: string;
  access_json: Record<string, unknown> | null;
  department: string;
  email: string;
  status: string;
  notes: string | null;
  force_password_change: boolean;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  last_login_at?: string | null;
}

export interface Settings {
  id?: number;
  payload_json: Record<string, unknown>;
  updated_at?: string;
  updated_by?: string;
}

export interface AuditLog {
  id?: number;
  action: string;
  inv_no: string;
  customer: string;
  actor: string;
  detail: string | null;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  fields_json: string[] | null;
  entity_type: string;
  entity_id: string;
  created_at?: string;
}

export interface Backup {
  id?: number;
  filename: string;
  record_count: number;
  overdue_count: number;
  cancelled_count: number;
  warning_text: string | null;
  payload_json: Record<string, unknown>;
  created_at?: string;
}

export interface Notification {
  id?: number;
  title: string;
  body: string | null;
  level: string;
  read_at: string | null;
  payload_json: Record<string, unknown>;
  created_at?: string;
}

export interface PublicAccount {
  id: number;
  username: string;
  fullName: string;
  role: string;
  access: Record<string, unknown>;
  department: string;
  email: string;
  status: string;
  notes: string;
  forcePasswordChange: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  lastLogin: string | null;
  source: string;
}

export interface PermissionProfile {
  tabs: string[];
  canEditSummary: boolean;
  canEncode: boolean;
  canCancel: boolean;
  canExport: boolean;
  canResetSample: boolean;
  canAdminReset: boolean;
  canResetOtherPasswords: boolean;
}
