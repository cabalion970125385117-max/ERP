# ATCA-ERP

**ATC Aviation Pte Ltd — Enterprise Resource Planning System**  
AS9100D · NADCAP AC7108 · NADCAP AC7110 · NADCAP AC7114 · NAS410  
LAN-only · Version 1.0 · SoR Rev. 1.0 (9 June 2026) · Last updated: 2026-06-30 · Multi-entity switcher (ATCA/ATCT/APF) + Inter-Company Trading; Governance/Forms dev plan added

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

## Modules (MOD-01–37 + Inter-Company Trading — All Complete)

> **Governance (Phase 14, planned):** a forms/records/approval-control spine cuts across every module below — QM as default approver, a 3-step form sign-off chain (raiser → superior → QM), accepted forms promoted to withdrawable records, all approval flows surfaced in MOD-27, form-format change control, and an isolated trial environment. Design: **[GOVERNANCE-FORMS-DEVPLAN.md](GOVERNANCE-FORMS-DEVPLAN.md)**.

### Quality Management

| Module | Description | Compliance |
|---|---|---|
| **MOD-01** QMS Core | Policy, objectives, risk register, management review | AS9100D §5.2, §6.1, §6.2, §9.3 |
| **MOD-02** Document Control | Document register, revision workflow, retention schedule | AS9100D §7.5 |
| **MOD-07** NCR & CAPA | Non-conformance register + NCR detail (MRB disposition), root-cause analysis, CAPA detail with effectiveness verification | AS9100D §8.7, §8.7.1, §10.2 |
| **MOD-08** Audit Management | Audit plans, findings register, response & verification | AS9100D §9.2 |
| **MOD-20** Customer Complaint & 8D | Complaint register, 8D report (D1–D8 step workflow) | AS9100D §8.7 |

### NDT Process

| Module | Description | Compliance |
|---|---|---|
| **MOD-03** FPI Process Control | 8-step traveler (ASTM E1417/AMS 2644), sequential sign-off, disposition | AC7114, NAS410 |
| **MOD-04** Personnel & NAS410 | Certifications (Level I/II/III), eye exams, qualification tracking | NAS410, AS9100D §7.2 |
| **MOD-05** Equipment & Calibration | Equipment register, calibration records, RAG due alerts, OOT quarantine | AS9100D §7.1.5 |
| **MOD-06** Chemical Processing (Electroplating) & FPI Tank Control | Two registers split by `process_category`: **FPI Process Tanks (NDT** · ASTM E1417/AMS 2644) and **Electroplating / Chemical Processing** (anodize, plating, EN, passivation… per the PCM, with Bay + size envelope); per-tab KPIs, sample recording, RAG, out-of-spec workflow | AC7108, AC7110, AC7114, E1417 |
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
| **MOD-28** Process Capability Master | Mirrors `ATC-PCM-001` — process × customer × specification capability register (Anodizing, plating, EN, passivation, NDT…), tiered classifications + size envelope, revision history; seeded from the PCM workbook via `tools/import_pcm.py` |
| **MOD-29** Customer Qualification | Qualification lifecycle — Gap Analysis → Close Gap → Qualification → Award → Periodic Audit; gaps escalatable to NCR, qualification activities (trial/FAI/audit), award (cert + validity, QA_MANAGER-gated), recurring periodic audits; AS9100D §8.4 / §9.2 |
| **MOD-30** Pyrometry & Heat-Treat | Oven/furnace register (AMS 2750H), TUS & SAT pyrometry schedules, thermocouple expiry/usage, **aerospace-only routing check** (which qualified oven can run a process temp); NADCAP AC7102 |
| **MOD-31** Operator Competency & PIN Sign-off | Competency matrix (operator × process × customer × bay), approval levels/expiry; **PIN-verified non-repudiable electronic sign-off** with competency gate + audit trail; NAS410, AS9100D §7.2 |
| **MOD-32** Bay Load Scheduler | Bay/shift scheduling queue; **tank-fit check** (part L×W×D vs PCM tank envelope, OVERSIZE flag); visual slot cards per bay × shift; manual vs auto line; AS9100D §8.1 |
| **MOD-33** Spec & Flowdown / Frozen Process | Spec library (customer/industry/internal); parameter flowdown spec→recipe; **frozen-process guard** (ENGINEER blocked on frozen specs, must raise ECN); ECN state machine (DRAFT→IMPLEMENTED); Acceptance Authority Matrix (2-person, PIN, QAM co-sign); NADCAP Frozen Process, AS9100D §8.1, §8.5.6 |
| **MOD-34** Chemical & Hazmat Control | SDS register (12 chemicals, OVERDUE/DUE_SOON RAG, controlled-substance flags); **bath make-up calculator** (sequenced addition steps, CONTROLLED warning banner); replenishment queue (OUT_OF_SPEC/SCHEDULED/LOW_STOCK triggers); chemical inventory; **Alert Escalation Engine** (10 cross-module rules, CRITICAL/ALERT/WARNING, acknowledge workflow); AC7108/AC7110, WSH/SDS, REACH/RoHS, AS9100D §9.1 |
| **MOD-35** Government & Regulatory Certification Renewal Monitoring | Cert register for all NADCAP accreditations, customer approvals, government licenses, ISO registrations; configurable renewal lead days; OVERDUE/DUE_SOON/OK RAG; renewal action workflow (INITIATE→SUBMIT_APPLICATION→AUDIT_SCHEDULED→AUDIT_COMPLETE→CERT_RECEIVED); body-type filtering (NADCAP/CUSTOMER/GOVERNMENT/ISO_BODY/INDUSTRY); AS9100D §7.1.2, NADCAP AC7102/AC7108/AC7114, MOM WSH Act, CAAS AMO |
| **MOD-36** Equipment Periodic Preventive Maintenance | Asset register (15 assets: OVEN/TANK/NDT_EQUIPMENT/COMPRESSOR/RECTIFIER/HVAC/INSTRUMENT); cross-ref to MOD-30 ovens; PM schedules (DAILY→ANNUAL); checklist tasks; log PM completion with auto-advance `next_due_date` (DATEADD by frequency); OVERDUE/DUE_SOON (≤7 days)/OK RAG; AS9100D §7.1.3, AMS 2750H equipment requirements, NADCAP AC7108 |
| **MOD-37** File Repository | Central document store for all modules; `ATCA.fileStore` API (`put/get/list/open/summary`, `FILE-NNNN`, file tags, cross-module entity linking); File Browser / Upload / Storage Overview; AS9100D §7.5 |
| **Inter-Company Trading** (mod-interco) | Multi-entity (ATCA/ATCT/APF) trading — Interco PO (`ICO-PO-YYYY-NNN`), Interco DO (`ICO-DO-YYYY-NNN`), Shared Assets register (`scope:'ALL'`); entity switcher pill (`ATCA.entity`) in every topbar; active entity in `atca_active_entity` |
| **MOD-39** Forms, Records & Change Control *(planned — Phase 14)* | Governance console: Form Register (FM-NNN + 3-step sign-off), Records (accepted forms in MOD-37), Revision Register (form-format change control), Approval Flow Map, Trial Environment; see GOVERNANCE-FORMS-DEVPLAN.md |

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
│   │       ├── mod28-pcm/              # MOD-28 Process Capability Master
│   │       ├── mod29-qualification/    # MOD-29 Customer Qualification
│   │       ├── mod30-pyrometry/        # MOD-30 Pyrometry & Heat-Treat
│   │       ├── mod31-operator-competency/ # MOD-31 Operator Competency & PIN
│   │       ├── mod32-bay-scheduler/    # MOD-32 Bay Load Scheduler + Tank-Fit
│   │       ├── mod33-spec-flowdown/    # MOD-33 Spec & Flowdown / Frozen Process
│   │       ├── mod34-chemical-hazmat/  # MOD-34 Chemical & Hazmat + Escalation Engine
│   │       ├── mod35-regulatory-certs/ # MOD-35 Government & Regulatory Cert Renewal
│   │       ├── mod36-equipment-ppm/    # MOD-36 Equipment Periodic Preventive Maintenance
│   │       ├── mod-changelog/
│   │       ├── mod-bugreport/
│   │       └── mod-chat/
│   └── database/
│       └── migrations/             # 039 SQL migration scripts
├── database/migrations/            # Additional migration scripts
├── preview_server.py               # Local preview server (no DB required)
├── vercel.json                     # Vercel static deployment config
├── TEST-PLAN.md                    # System test plan v1.2 (170+ test cases)
├── DEVELOPMENT-STANDARDS.md        # Mandatory dev governance: Rules 1–7 (audit log, form numbers, revision history, QM approver, 3-step sign-off, forms→records, change control)
├── GOVERNANCE-FORMS-DEVPLAN.md     # Phase 14 dev plan: forms→records, 3-step sign-off, approval-flow map, revision control, trial env (MOD-39)
├── MOD27-DEVPLAN.md                # MOD-27 Value Flow Tracker dev plan
├── PCM-QUAL-DEVPLAN.md             # MOD-28/29 Process Capability + Qualification dev plan
├── ROADMAP.md                      # Forward roadmap (Phases 9–14)
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
Every module exposes `GET /api/v1/modXX/alerts/summary` returning a standardised JSON object. MOD-15 KPI Dashboard aggregates all 28 endpoints client-side via `Promise.all` to build the compliance health ring.

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

See [TEST-PLAN.md](TEST-PLAN.md) for the full test plan (v1.9, 210+ test cases).

**Sections:**
- §2 Unit tests — auth, sequences, FPI, MPT, bath, calibration, personnel, finance, CoC, purchasing
- §3 Integration tests — all API endpoints incl. MOD-25 user management (I-USR-01–15)
- §4 Compliance-critical tests — AS9100D, AC7108, AC7114 FPI/MPT, NAS410
- §5 Security & RBAC — 12 escalation checks, injection prevention, soft-delete leakage
- §6 End-to-end workflows — 10 Playwright scenarios (FPI lifecycle, bath OOT→NCR, MPT gates, etc.)
- §7 Alert summary contracts — field verification for all 26 modules
- §13 UX & System QC Protocol — 31 executable checks; last run 2026-06-15: 31/31 PASS

---

## Roadmap (Phases 9–14)

Forward features are sequenced into structure-driven phases — see **[ROADMAP.md](ROADMAP.md)** for the full plan. Grounded in ATC's actual structure (process bays, AMS 2750 ovens, aerospace + semiconductor markets) from `ATC-PCM-001` and the SoR. Phases 9–12 are built; Phase 13 is partial (MOD-37 + multi-entity built); Phase 14 (governance) is planned.

| Phase | Theme | New modules |
|---|---|---|
| **9** Special-Process Compliance Core ✅ **BUILT** | **MOD-30 Pyrometry & Heat-Treat** (AMS 2750 / NADCAP AC7102), **MOD-31 Operator Competency & PIN sign-off** (= Electronic Signature) |
| **10** Capacity & Process Control ✅ **BUILT** | **MOD-32 Bay Load Scheduler + tank-fit**, **MOD-33 Spec & Flowdown / Frozen Process**, ECN, AAM |
| **11** Chemicals, Safety & Escalation ✅ **BUILT** | **MOD-34 Chemical & Hazmat control** (SDS, bath make-up/replenishment, cyanide/cadmium controls), Alert Escalation Engine |
| **12** Compliance Monitoring & Asset Management ✅ **BUILT** | **MOD-35 Government & Regulatory Cert Renewal Monitoring**, **MOD-36 Equipment Periodic Preventive Maintenance** |
| **13** Group Scale & Central Document Store ✅ **PARTIAL** | **MOD-37 File Repository** ✅, **Multi-entity switcher + Inter-Company Trading** (ATCA/ATCT/APF) ✅, Document Template & Rule Engine 📋, Semiconductor Segment 📋 |
| **14** Governance, Forms & Change Control 📋 **PLANNED** | **MOD-39 Forms/Records/Change-Control console**; QM default approver; 3-step form sign-off → withdrawable records; approval-flow map in MOD-27; form-format revision control; isolated trial environment — see **[GOVERNANCE-FORMS-DEVPLAN.md](GOVERNANCE-FORMS-DEVPLAN.md)** |

**Recommended next:** Phase 14 → build the governance spine (`ATCA.forms/records/approvals/revision/env` shared services + MOD-39 console) per **[GOVERNANCE-FORMS-DEVPLAN.md](GOVERNANCE-FORMS-DEVPLAN.md)**.

---

## License

`UNLICENSED` — proprietary system for ATC Aviation Pte Ltd internal use only.
