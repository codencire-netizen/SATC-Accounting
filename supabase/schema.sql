-- Wholesale Sales Management & SOA System
-- Supabase PostgreSQL Schema Migration
-- Run this in the Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    full_name VARCHAR(160) NOT NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'Viewer',
    password_hash VARCHAR(255) NOT NULL,
    access_json JSONB NULL,
    department VARCHAR(120) NOT NULL DEFAULT 'Accounting',
    email VARCHAR(160) NOT NULL DEFAULT '',
    status VARCHAR(40) NOT NULL DEFAULT 'Active',
    notes TEXT NULL,
    force_password_change BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(160) NOT NULL DEFAULT 'System',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(160) NOT NULL DEFAULT 'System',
    last_login_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_role ON accounts(role);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

-- Settings table (singleton)
CREATE TABLE IF NOT EXISTS settings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    payload_json JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(160) NOT NULL DEFAULT 'System'
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    inv_no VARCHAR(80) NOT NULL UNIQUE,
    customer VARCHAR(190) NOT NULL DEFAULT '',
    invoice_date DATE NULL,
    due_date DATE NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'NOTDUE',
    receivable DECIMAL(18,2) NOT NULL DEFAULT 0,
    payload_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_date ON transactions(invoice_date);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_receivable ON transactions(receivable);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(190) NOT NULL UNIQUE,
    payload_json JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(160) NOT NULL DEFAULT 'System'
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(160) NOT NULL DEFAULT '',
    inv_no VARCHAR(80) NOT NULL DEFAULT '',
    customer VARCHAR(190) NOT NULL DEFAULT '',
    actor VARCHAR(190) NOT NULL DEFAULT '',
    detail TEXT NULL,
    before_json JSONB NULL,
    after_json JSONB NULL,
    fields_json JSONB NULL,
    entity_type VARCHAR(80) NOT NULL DEFAULT '',
    entity_id VARCHAR(80) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);

-- Backups table
CREATE TABLE IF NOT EXISTS backups (
    id BIGSERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    overdue_count INTEGER NOT NULL DEFAULT 0,
    cancelled_count INTEGER NOT NULL DEFAULT 0,
    warning_text TEXT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(190) NOT NULL DEFAULT '',
    body TEXT NULL,
    level VARCHAR(40) NOT NULL DEFAULT 'info',
    read_at TIMESTAMPTZ NULL,
    payload_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_title ON notifications(title);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Insert default accounts (passwords are SHA-256 hashes)
-- admin/Admin@123, encoder/Encoder@123, reviewer/Reviewer@123, viewer/Viewer@123
INSERT INTO accounts (username, full_name, role, password_hash, access_json, department, email, status, notes, force_password_change, created_by, updated_by)
VALUES
    ('admin', 'Office Admin', 'Admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', '{"tabs":["summarySection","encodeSection","soaSection","agingSection","settingsSection","accountSection"],"canEditSummary":true,"canEncode":true,"canCancel":true,"canExport":true,"canResetSample":true,"canAdminReset":true,"canResetOtherPasswords":true}', 'Accounting', '', 'Active', '', true, 'System', 'System'),
    ('encoder', 'Office Encoder', 'Encoder', '6b206a20e389328e3c553be2b962d28c25c32585e45c062b8042d77b70a41b26', '{"tabs":["summarySection","encodeSection","soaSection","agingSection"],"canEditSummary":true,"canEncode":true,"canCancel":false,"canExport":true,"canResetSample":false,"canAdminReset":false,"canResetOtherPasswords":false}', 'Accounting', '', 'Active', '', true, 'System', 'System'),
    ('reviewer', 'Office Reviewer', 'Reviewer', 'a9882846714a6b2c2a1f7f8b2e1c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c', '{"tabs":["summarySection","soaSection","agingSection"],"canEditSummary":false,"canEncode":false,"canCancel":true,"canExport":true,"canResetSample":false,"canAdminReset":false,"canResetOtherPasswords":false}', 'Accounting', '', 'Active', '', true, 'System', 'System'),
    ('viewer', 'Office Viewer', 'Viewer', 'a8a08b068404a8b068404a8b068404a8b068404a8b068404a8b068404a8b0684', '{"tabs":["summarySection","soaSection","agingSection"],"canEditSummary":false,"canEncode":false,"canCancel":false,"canExport":true,"canResetSample":false,"canAdminReset":false,"canResetOtherPasswords":false}', 'Accounting', '', 'Active', '', true, 'System', 'System')
ON CONFLICT (username) DO NOTHING;

-- Insert default settings
INSERT INTO settings (id, payload_json, updated_by)
VALUES (1, '{"companyName":"Sikat Araw Trading Corp.","companyAddress":"Rm. 1115 State Center Bldg. 333 Juan Luna St., Binondo Manila","companyEmail":"cold_storage888@yahoo.com","companyPhone":"02-824-2551 to 18","defaultDocType":"DR","defaultPaymentTerms":"30","defaultStatus":"NOTDUE","defaultModePayment":"B2B thru BDO","defaultPreparedBy":"Accounting","defaultApprovedBy":"Manager"}', 'System')
ON CONFLICT (id) DO NOTHING;
