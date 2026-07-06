# SATC Wholesale Sales Management System — Full Project Prompt

## Company Profile
- Name: Sikat Araw Trading Corp.
- Address: Rm. 1115 State Center Bldg. 333 Juan Luna St., Binondo Manila
- Phone: 02-824-2551 to 18
- Email: cold_storage888@yahoo.com
- Developer: Eric Malonosan
- Currency: Philippine Peso (₱)
- Timezone: Asia/Manila

## Live Resources
- GitHub: codencire-netizen/SATC-Accounting
- Vercel: satc-accounting-qnpc.vercel.app
- Supabase: wwbegwghetqvkgkleblep.supabase.co

## Tech Stack
- Frontend: Single-file vanilla HTML/CSS/JS (index.html, ~21K lines)
- Backend: Vercel Serverless (api/index.js — single consolidated function)
- Database: Supabase PostgreSQL (REST API via fetch, no JS client)
- Auth: SHA-256 password hashing, session-based login
- Data: invoice-database.js (3,336 records, 6 document sections)

## System Modules

### 1. Dashboard
KPI cards: Total Gross Sales, Net Sales, Outstanding AR, Past Due Amount.
Secondary metrics: Collection Rate, Overdue Share, Average Ticket, Top Exposure.
Progress bars: Sales, Collections, AR, Past Due with percentage ratios.
Sparkline charts for trend visualization.

### 2. Wholesale Sales Summary
Search-only transaction table (requires 2+ characters to display results).
Section sub-tabs: CHSI Series, CASI Series, DR Wholesale, DR Seafood DR, DR Seafood CHSI, DR Local Sales.
Click customer name → navigates to Encoding with customer pre-loaded.
Status filter dropdown. Month filter. Export CSV/Excel.

### 3. Encoding
Four-step wizard: Transaction Details → Items & Amounts → Payment & Terms → Review & Save.
Receivable Status: NOT DUE, PAID, PARTIAL PAYMENT, PAST DUE.
Doc Section selector maps to document type categorization.
Delete Invoice button (Admin/Encoder only). Cancel Invoice button.
Auto-due date calculation from payment terms.

### 4. Statement of Account
Customer dropdown with live search. Date range filtering (From/To/As Of).
Three tabs: Transaction Details, Print Layout, Editor.
Section filter for document type. SOA number auto-generation.
Print-ready layout with company header, Days Past Due table, transaction grid.

### 5. Aging Report
Five metric cards: Total Current (0-30), 31-60 Days, 61-90 Days, Over 90 Days, Total Outstanding.
Group By options: Customer, Invoice, Document Type, Representative, Area.
Status filter: All, Current/Paid, Warning/Due Soon, Critical/Past Due, Cancelled.
Aging calculation note explaining bucket logic.

### 6. Settings
Company Info card: name, address, email, phone.
Defaults card: document type, payment terms, status, mode of payment, prepared by, approved by.
Backup panel: JSON backup, export JSON/CSV, copy filename, clear history, undo last import.

### 7. Account Management
Create Account form: Identity (profile image, full name, username, email), Security (password, confirm, temp password, force change), Access (department, role, status), Notes.
Account List table with avatar, role badge, status, access summary, created/last login dates.
Actions column: Audit button (navigates to Audit Trail filtered by user), Delete button (with confirmation).
Access Control panel: tab permissions, capability checkboxes, save/reset to role default, change password.

### 8. Audit Trail
Dashboard: Total Activities, Today count, Latest Action, Latest User, Edited Today, Deleted/Cancelled.
Search bar filters by action, invoice, customer, user, or details text.
Filter by action type dropdown and date range.
Table columns: Date & Time, User/Role (with avatar), Module, Action, Invoice/Record, Customer, Field Changed, Old Value, New Value, Reason, Device.

## User Roles & Permissions

| Role | Tabs | Edit | Encode | Cancel | Export | Admin | Reset Others |
|------|------|------|--------|--------|--------|-------|-------------|
| President | All 7 | Yes | Yes | Yes | Yes | Yes | Yes |
| Admin | All 7 | Yes | Yes | Yes | Yes | Yes | Yes |
| Encoder | Summary, Encoding, SOA, Aging | Yes | Yes | No | Yes | No | No |
| Reviewer | Summary, SOA, Aging | No | No | Yes | Yes | No | No |
| Viewer | Summary, SOA, Aging | No | No | No | Yes | No | No |

## Default Accounts

| Role | Name | Username | Password | Department |
|------|------|----------|----------|------------|
| President | Marco Qua | marco | President@123 | Management |
| Admin | Office Admin | admin | Admin@123 | Accounting |
| Encoder | Office Encoder | encoder | Encoder@123 | Accounting |
| Reviewer | Office Reviewer | reviewer | Reviewer@123 | Accounting |
| Viewer | Office Viewer | viewer | Viewer@123 | Accounting |

## Sales Representatives
- M1: Marco
- M2: Morris

## Data Structure (invoice-database.js)
3,336 records across 6 document sections:
- CHSI Series: 2,462 records (Charge Sales Invoices)
- CASI Series: 204 records (Cash Sales Invoices)
- DR Wholesale: 503 records (Delivery Receipt Wholesale)
- DR Seafood DR: 79 records (Delivery Receipt Seafood Online)
- DR Seafood CHSI: 70 records (Delivery Receipt Seafood CHSI)
- DR Local Sales: 18 records (Delivery Receipt Local)

Each record contains: sourceSheet, sourceRow, section, invNo, customer, tin, date, gross, freight, salesReturn, discountDM, returnsDisc, notes, netDeduction, ewt, netSales, depositDate, bank, crDetails, payment, dueDate, daysPastDue, status, receivable, terms.

Source: 2026-WHOLESALE_UPDATED_JAN_DEC_DATA_REFERENCE.json (JAN-JUN data, JUL-DEC empty).

## API Endpoints (api/index.js)
- GET /api/health — Health check with DB status
- POST /api/auth/login — Authenticate user (SHA-256 hash comparison)
- GET /api/accounts — List all accounts
- POST /api/accounts — Create new account
- PUT /api/accounts/:id — Update account
- DELETE /api/accounts/:id — Delete account
- GET /api/transactions — List transactions
- POST /api/transactions — Create transaction
- PUT /api/transactions/:id — Update transaction
- DELETE /api/transactions/:id — Delete transaction
- GET /api/customers — List customers
- GET /api/audit — List audit entries
- POST /api/audit — Create audit entry
- GET /api/settings — Get settings
- POST /api/settings — Update settings

## Deployment Configuration (vercel.json)
Builds: api/*.js (node), index.html (static), assets/** (static), data/** (static).
Routes: /api/* → api/index.js, /data/* → data/$1, /assets/* → assets/$1, /* → index.html.

## Supabase Schema Tables
- accounts (id, username, full_name, role, password_hash, access_json, department, email, status, notes, force_password_change, profile_image, created_at, updated_at, last_login_at)
- transactions (id, inv_no, customer, invoice_date, due_date, status, receivable, payload_json, created_at, updated_at)
- customers (id, name, payload_json, updated_at, updated_by)
- audit_log (id, action, inv_no, customer, actor, detail, before_json, after_json, fields_json, entity_type, entity_id, created_at)
- backups (id, filename, record_count, overdue_count, cancelled_count, warning_text, payload_json, created_at)
- notifications (id, title, body, level, read_at, payload_json, created_at)
- settings (id, payload_json, updated_at, updated_by)

## Key Features
- Light theme for all modules (login page and sidebar remain dark)
- Mobile responsive (5 breakpoints: 1100px, 900px, 768px, 640px, 480px)
- Profile images for user accounts (base64 stored)
- Section sub-tabs on Sales Summary dashboard
- Search-only transaction table (2+ char minimum)
- Cross-device login via Supabase (not localStorage)
- Developer credit: "Developed by: Eric Malonosan" on login page
- Account Management with Audit and Delete buttons per row
- Receivable Status with PARTIAL PAYMENT support
- Document type categorization across all modules
