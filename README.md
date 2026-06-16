# ATCA-ERP

**ATC Aviation Pte Ltd — Enterprise Resource Planning System**  
AS9100D · NADCAP AC7108 · NADCAP AC7110 · NADCAP AC7114 · NAS410  
LAN-only · Version 1.0 · SoR Rev. 1.0 (9 June 2026)

---

## Overview

ATCA-ERP is a purpose-built quality management and operations ERP for ATC Aviation Pte Ltd, an aerospace NDT (Non-Destructive Testing) and special-process facility. It covers the full operational lifecycle — from customer order through NDT processing, certificate of conformance, and payroll — in a single integrated system aligned to AS9100D, NADCAP AC7108/AC7110/AC7114, and NAS410.

The system is **LAN-only** (no internet dependency). All assets are locally bundled. The backend targets a SQL Server instance at `192.168.1.10/ATCA_ERP_DB`.

**Live preview (static frontend):** [https://atca-erp.vercel.app](https://atca-erp.vercel.app)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js 18+, Express 4 |
| **Database** | Microsoft SQL Server (mssql driver) |
| **Auth** | express-session (SQL-backed), bcrypt rounds=12, 8-hour shift sessions |
| **Frontend** | Bootstrap 5 (locally bundled), Vanilla JS ES6+, `ATCA.*` namespace |
| **Preview** | Python `ThreadingHTTPServer` with stub API responses (no DB required) |
| **Security** | Helmet, RBAC, parameterised SQL queries, soft deletes, audit log |

---

## Role-Based Access Control

Six roles in ascending privilege order:

| Role | Description |
|---|---|
| `READONLY` | View-only across all modules |
| `NDT_INSPECTOR` | Log inspections, record bath tests, standard operational role |
| `SUPERVISOR` | Sign-off on job steps and inspections |
| `ENGINEER` | Create/edit process records, work orders, bath logs |
| `QA_MANAGER` | Approve documents, close NCRs/CAPAs, manage audits, issue CoCs |
| `ADMIN` | Full system access — user management, system config, maintenance console |

---

## Modules (26 SoR Modules — All Complete)

### Quality Management

| Module | Description | Compliance |
|---|---|---|
| **MOD-01** QMS Core | Policy, objectives, risk register, management review | AS9100D §5.2, §6.1, §6.2, §9.3 |
| **MOD-02** Document Control | Document register, revision workflow, retention schedule | AS9100D §7.5 |
| **MOD-07** NCR & CAPA | Non-conformance, root-cause analysis, corrective actions | AS9100D §8.7, §10.2 |
| **MOD-08** Audit Management | Audit plans, findings register, response & verification | AS9100D §9.2 |
| **MOD-20** Customer Complaint & 8D | Complaint register, 8D report (D1–D8 step workflow) | AS9100D §8.7 |

### NDT Process

| Module | Description | Compliance |
|---|---|---|
| **MOD-03** FPI Process Control | 8-step traveler (ASTM E1417/AMS 2644), sequential sign-off, disposition | AC7114, NAS410 |
| **MOD-04** Personnel & NAS410 | Certifications (Level I/II/III), eye exams, qualification tracking | NAS410, AS9100D §7.2 |
| **MOD-05** Equipment & Calibration | Equipment register, calibration records, RAG due alerts, OOT quarantine | AS9100D §7.1.5 |
| **MOD-06** Chemical Bath Control | Bath register, sample recording, RAG status, out-of-spec workflow | AC7108, AC7110, AC7114 |
| **MOD-17** MPT Process Control | 6-step AC7114 traveler (ASTM E1444), UV/ambient light gates | AC7114, NAS410 |

### Operations

| Module | Description | Compliance |
|---|---|---|
| **MOD-09** Sales & Customer Service | Customers, part master, quotations, contract reviews, GRN, delivery orders | AS9100D §8.2 |
| **MOD-10** Production Management | Route cards, production conditions (AC7108 App D), test pieces, shift checklists | AS9100D §8.5 |
| **MOD-11** Maintenance | Asset register, PM schedule (RAG), work permits, external service providers | AS9100D §7.1 |
| **MOD-12** Purchasing & Supplier/AVL | Supplier register, PRs, POs with AVL gate, accreditation expiry | AS9100D §8.4 |
| **MOD-13** Work Order / Job Traveler | WO register, job traveler with step sign-off, status pipeline | AS9100D §8.5 |
| **MOD-14** Inventory Management | Inventory register (RAG kanban), stock movements, hazardous flags | AS9100D §7.1 |
| **MOD-19** Extended Laboratory | Analysis schedules, results, chemical inventory + SDS, lab validations, external labs | AS9100D §7.1 |
| **MOD-24** Certificate of Conformance | CoC register, DRAFT→ISSUED→VOID workflow, printable template | AS9100D §8.6 |

### Business & HR

| Module | Description | Compliance |
|---|---|---|
| **MOD-16** Finance | GL, AR/AP invoices, journal entries (balance enforced), fixed assets, budget | AS9100D §8.1 |
| **MOD-18** Organisation & HR | Staff register (EMP-NNNN), org chart, onboarding, COI declarations | AS9100D §7.2 |
| **MOD-21** Communications | Announcement board, priority badges (URGENT/IMPORTANT/NORMAL), acknowledgement | — |
| **MOD-22** Leave & Attendance | Leave requests, approvals, leave types, attendance records | — |
| **MOD-23** Payroll Processing | Payroll runs, CPF lines, approve (QA_MANAGER) / disburse (ADMIN) | — |

### System

| Module | Description |
|---|---|
| **MOD-15** KPI Dashboard | Cross-module compliance health ring; aggregates all `/modXX/alerts/summary` client-side; attention list sorted by criticality; AS9100D §9.1 |
| **MOD-25** User & Role Management | User register, create/edit/deactivate, password reset (bcrypt), signature upload; ADMIN mutations, QA_MANAGER+ view |
| **MOD-26** System Maintenance Console | ADMIN-gated superuser console — storage analytics, activity logs, user management, password control, backup & download, maintenance mode toggle |
| **MOD-27** Value Flow Tracker | Interactive 8-stage PO→GRN→WO→NDT→COC→DO pipeline diagram; GRN lookup shows live job position with colour-coded stage status; clickable stage nodes link to owning module; read-only (NDT_INSPECTOR+); AS9100D §8.5 |

### Phase 8 Utilities

| Page | Description |
|---|---|
| **Change Log** | Version history (FEATURE/BUGFIX/MIGRATION/CONFIG/SECURITY badges) |
| **Bug Report** | Issue tracker — CRITICAL→LOW severity; Resolve workflow (SUPERVISOR+) |
| **Internal Chat** | WhatsApp-style messaging; DIRECT & GROUP rooms; 3-second incremental polling; soft-delete |
| **User Guide** | Full in-app manual — all modules, compliance refs, role table, NADCAP/NAS410 clause index |

---

## Project Structure

```
ATCA-ERP/
├── src/
│   ├── backend/
│   │   ├── server.js               # Express entry point; auth routes; SPA fallback
│   │   ├── config/database.js      # mssql connection pool
│   │   ├── middleware/auth.js      # requireAuth, requireMinRole, requireRole, auditLog
│   │   └── api/
│   │       ├── qms-core/           # MOD-01
│   │       ├── document-control/   # MOD-02
│   │       ├── fpi-process/        # MOD-03
│   │       ├── ndt-personnel/      # MOD-04
│   │       ├── equipment-calibration/ # MOD-05
│   │       ├── chemical-bath-control/ # MOD-06
│   │       ├── ncr-capa/           # MOD-07
│   │       ├── audit-management/   # MOD-08
│   │       ├── sales-customer-service/ # MOD-09
│   │       ├── production-management/  # MOD-10
│   │       ├── maintenance/        # MOD-11
│   │       ├── purchasing/         # MOD-12
│   │       ├── work-order/         # MOD-13
│   │       ├── inventory/          # MOD-14
│   │       ├── finance/            # MOD-16
│   │       ├── hr-management/      # MOD-18
│   │       ├── extended-laboratory/ # MOD-19
│   │       ├── customer-complaint/ # MOD-20
│   │       ├── communications/     # MOD-21
│   │       ├── leave-attendance/   # MOD-22
│   │       ├── payroll/            # MOD-23
│   │       ├── certificate-of-conformance/ # MOD-24
│   │       ├── mod25/              # MOD-25 User Management
│   │       ├── mod27/              # MOD-27 Value Flow Tracker
│   │       ├── changelog/          # Change Log
│   │       ├── bugreport/          # Bug Report
│   │       └── chat/               # Internal Chat
│   ├── frontend/
│   │   ├── index.html              # Home dashboard
│   │   ├── login.html
│   │   ├── user-guide.html
│   │   ├── assets/
│   │   │   ├── css/                # Bootstrap 5 + atca-erp.css (locally bundled)
│   │   │   ├── js/                 # Bootstrap bundle + atca-core.js
│   │   │   └── fonts/              # Bootstrap Icons (locally bundled)
│   │   └── modules/
│   │       ├── mod01-qms-core/
│   │       ├── mod02-document-control/
│   │       ├── mod03-fpi-process/
│   │       ├── ...                 # (all 26 SoR modules)
│   │       ├── mod25-user-management/
│   │       ├── mod26-maintenance/
│   │       ├── mod27-value-flow/
│   │       ├── mod-changelog/
│   │       ├── mod-bugreport/
│   │       └── mod-chat/
│   └── database/
│       └── migrations/             # 028 SQL migration scripts
├── database/migrations/            # Additional migration scripts
├── preview_server.py               # Local preview server (no DB required)
├── vercel.json                     # Vercel static deployment config
├── TEST-PLAN.md                    # System test plan v1.2 (170+ test cases)
├── MEMORY.md                       # Build log and dev reference
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Microsoft SQL Server (LAN: `192.168.1.10/ATCA_ERP_DB`)
- Python 3.8+ (for local preview only)

### Local Preview (No Database Required)

The preview server serves the frontend with stub API responses — no SQL Server needed.

```bash
python preview_server.py
# → http://localhost:3000
# Preview account: admin / any password (auto-authenticated, role: ADMIN)
```

### Production Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: DB_HOST, DB_NAME, DB_USER, DB_PASS, SESSION_SECRET

# 3. Run database migrations
# Execute scripts in src/database/migrations/ in order (001 → 028)
# against ATCA_ERP_DB on SQL Server

# 4. Start the server
npm start          # production
npm run dev        # development (nodemon)
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `DB_HOST` | `192.168.1.10` | SQL Server hostname |
| `DB_NAME` | `ATCA_ERP_DB` | Database name |
| `DB_USER` | `atca_app` | SQL login |
| `DB_PASS` | *(required)* | SQL password |
| `SESSION_SECRET` | *(required in prod)* | express-session secret |
| `NODE_ENV` | `development` | Set to `production` for SQL session store + secure cookies |

---

## Key Design Decisions

### RBAC
All API routes are gated with `requireAuth` + `requireMinRole` or `requireRole`. The frontend performs a secondary access check via `ATCA.user.hasRole()` but the server is the authority.

### Audit Log
Every write endpoint calls `auditLog({ userId, username, lanIp, action, tableName, recordId, moduleId, oldValue, newValue })`. The `AuditLog` table is the compliance trail for NADCAP audits.

### Auto-number Sequences
Each module with numbered records uses a dedicated `Mod##Sequence` table updated via an atomic `UPDATE + SELECT OUTPUT` pattern — no race conditions on concurrent job creation.

Format: `PREFIX-YYYY-NNNN` (e.g. `FPI-2026-0042`, `WO-2026-0015`, `COC-2026-0007`)

### Alert Summary API
Every module exposes `GET /api/v1/modXX/alerts/summary` returning a standardised JSON object. MOD-15 KPI Dashboard aggregates all 26 endpoints client-side via `Promise.all` to build the compliance health ring.

### Frontend Architecture
Three header layouts coexist across the 28 module pages (legacy Layout A with `#topbar`, Layout B with `#atca-topbar`, Layout C with `nav.navbar`). The global `ATCA.nav.init()` in `atca-core.js` detects which layout is present and injects the home button in the correct location — no per-page changes needed.

### Encoding
All frontend files are **UTF-8 no-BOM**. Never save with PowerShell `Set-Content -Encoding utf8` (PS 5.1 adds a BOM and causes mojibake). Use the Write/Edit tools or specify `-Encoding utf8NoBOM`.

---

## Compliance Coverage

| Standard | Scope | Primary Modules |
|---|---|---|
| **AS9100D** | Aerospace QMS — policy, risk, document control, audits, NCR/CAPA, CoC | MOD-01, 02, 07, 08, 24 |
| **NADCAP AC7108** | Chemical processing — bath chemistry, traveler sign-offs | MOD-06, 13, 05, 04 |
| **NADCAP AC7110** | Coatings — anodizing, plating, passivation; bath titration/pH/temp | MOD-06, 13, 05 |
| **NADCAP AC7114** | NDT — FPI (ASTM E1417/AMS 2644) and MPT (ASTM E1444); sequential steps; UV/light gates | MOD-03, 17, 06, 05, 04 |
| **NAS410** | NDT Personnel — Level I/II/III certification per method, 12-month eye exam | MOD-04 |

---

## Testing

See [TEST-PLAN.md](TEST-PLAN.md) for the full test plan (v1.2, 170+ test cases).

**Sections:**
- §2 Unit tests — auth, sequences, FPI, MPT, bath, calibration, personnel, finance, CoC, purchasing
- §3 Integration tests — all API endpoints incl. MOD-25 user management (I-USR-01–15)
- §4 Compliance-critical tests — AS9100D, AC7108, AC7114 FPI/MPT, NAS410
- §5 Security & RBAC — 12 escalation checks, injection prevention, soft-delete leakage
- §6 End-to-end workflows — 10 Playwright scenarios (FPI lifecycle, bath OOT→NCR, MPT gates, etc.)
- §7 Alert summary contracts — field verification for all 26 modules
- §13 UX & System QC Protocol — 31 executable checks; last run 2026-06-15: 31/31 PASS

---

## Phase 9 Backlog

The following cross-cutting features are planned for Phase 9:

- **Electronic Signature** — non-transferable, timestamped (required for NADCAP AAM)
- **AAM (Acceptance Authority Matrix)** — authorisation register with 2-person rule for destructive ops
- **ECN (Engineering Change Notice)** — change workflow with process impact assessment
- **Frozen Process Control** — customer approval gate for locked process parameters
- **Multi-entity Data Isolation** — all records tagged to legal entity for group operations
- **Alert Escalation Engine** — configurable escalation paths and timeframes per module
- **Document Template & Rule Engine** — form generation with compliance clause injection

---

## License

`UNLICENSED` — proprietary system for ATC Aviation Pte Ltd internal use only.
