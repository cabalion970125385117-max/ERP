# ATCA-ERP Build Memory
ATC Aviation Pte Ltd | AS9100D | NADCAP AC7114 | NAS410
**Last updated:** 2026-05-26

---

## Project Location
`C:\Users\Admin\Documents\Claude\Projects\ERP\ATCA-ERP`

## Stack
- **Backend:** Node.js 18+, Express 4, mssql (SQL Server)
- **Frontend:** Bootstrap 5 (locally bundled), Vanilla JS ES6+, ATCA.* namespace
- **Auth:** express-session (SQL-backed in prod), 8-hour shift sessions, bcrypt rounds=12
- **LAN-only:** No CDN; all assets from `/assets/`
- **Design registry:** `ATCA_ERP_Design_Registry_v3.xlsx` (INDEX, BRAND_COLORS, COMPANY, TECH_ARCH, MODULES, DB_SCHEMA, COMPLIANCE, PHILOSOPHY, PERSONNEL, REAL_DATA sheets)

## RBAC Role Hierarchy (ascending)
`READONLY → NDT_INSPECTOR → SUPERVISOR → ENGINEER → QA_MANAGER → ADMIN`

## Brand Colors
- ATC Primary Green: `#2D5016`
- Dark Forest (nav): `#1A2520`

## Key Patterns
- SQL params: `query(sql, [{name, type: sql.TypeName, value}])`
- Soft deletes: `is_active = 0`
- Pagination: `OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
- Audit log: `auditLog({ userId, username, lanIp, action, tableName, recordId, moduleId, newValue })`
- Frontend API: `ATCA.api.get('/modXX/endpoint')`, `ATCA.api.post(...)`, `ATCA.api.put(...)`
- Table render: `ATCA.table.render('tbody-id', items, rowFn)`
- KPI RAG classes: `.rag-red`, `.rag-amber`, `.rag-green` on `.kpi-card`

---

## Build Status

### ✅ COMPLETED

#### Database Migrations
| File | Module | Tables Created |
|------|--------|----------------|
| `001_core_framework.sql` | Core | Users, AuditLog, AlertLog |
| `002_mod01_qms_core.sql` | MOD-01 | QmsPolicy, QmsObjective, ManagementReview, RiskRegister |
| `003_mod02_document_control.sql` | MOD-02 | DocumentCategory, Document, DocumentRevision, RetentionSchedule |
| `004_mod07_ncr_capa.sql` | MOD-07 | NCR, CAPA, vw_NCR, audit triggers |
| `005_mod04_personnel.sql` | MOD-04 | Personnel, NdtCertification, TrainingRecord, EyeExam, vw_PersonnelStatus |
| `006_mod05_equipment.sql` | MOD-05 | Equipment, CalibrationRecord, vw_EquipmentCalStatus |

#### Backend API Routes
| Path | Module | Notes |
|------|--------|-------|
| `api/mod01/` | MOD-01 | policy, objectives, risks, reviews |
| `api/mod02/` | MOD-02 | documents, retention |
| `api/mod04/` | MOD-04 | personnel (+ eye-exams, training sub-routes), certifications |
| `api/mod05/` | MOD-05 | equipment, calibrations |
| `api/mod07/` | MOD-07 | ncr, capa |
| `server.js` | Core | Mounts mod01, mod02, mod04, mod05, mod07; GET /login; GET /logout |

#### Frontend Pages
| File | Module | Status |
|------|--------|--------|
| `login.html` | Auth | Done — standalone login page; handles session_expired/timeout reason params |
| `index.html` | Home | Done — home dashboard; cross-module KPI grid (mod04/05/07 alerts); module nav cards |
| `modules/mod01-qms-core/index.html` | MOD-01 | Done |
| `modules/mod01-qms-core/policy.html` | MOD-01 | Done |
| `modules/mod01-qms-core/objectives.html` | MOD-01 | Done |
| `modules/mod01-qms-core/mgmt-review.html` | MOD-01 | Done |
| `modules/mod01-qms-core/risk-register.html` | MOD-01 | Done |
| `modules/mod02-doc-control/index.html` | MOD-02 | Done |
| `modules/mod02-doc-control/documents.html` | MOD-02 | Done |
| `modules/mod02-doc-control/revision.html` | MOD-02 | Done |
| `modules/mod02-doc-control/retention.html` | MOD-02 | Done |
| `modules/mod04-personnel/index.html` | MOD-04 | Done |
| `modules/mod05-equipment/index.html` | MOD-05 | Done |
| `modules/mod07-ncr-capa/index.html` | MOD-07 | Done |
| `modules/mod25-users/index.html` | MOD-25 | Done |

---

### 🔲 PENDING — P1 Modules (build in this order)

#### 1. MOD-06: Chemical / Bath Control
- **DB tables:** `ChemBath` (bath_code UNIQUE, bath_type, process_area, spec_ref), `BathSampleResult` (sample_ref, test_type, result, within_spec BIT)
- **API:** GET/POST/PUT equipment baths; POST sample results; GET /alerts/summary
- **Frontend:** Bath register table with RAG (in-spec vs out-of-spec vs expired), record sample modal
- **Standards:** ASTM E1417 §6.3, AMS 2644, NADCAP AC7114 §8

#### 2. MOD-03: FPI Process Control
- **DB tables:** `FpiJob` (job_ref, part_number, work_order, method, penetrant_type, developer_type), `FpiInspection` (steps: pre-clean, penetrant apply, dwell, rinse, developer, interpret, post-clean)
- **API:** Create job, step-by-step sign-offs, get job history
- **Frontend:** Job traveler view; sign-off buttons per step; conditional accept/reject
- **Standards:** ASTM E1417, NAS410, AMS 2644

#### 3. MOD-08: Audit Management
- **DB tables:** `Audit` (audit_ref, audit_type IN INTERNAL/NADCAP/AS9100D/CUSTOMER, status), `AuditFinding` (finding_ref, severity IN OB/MN/MJ/NC, linked_ncr_id FK optional)
- **API:** Full CRUD with finding sub-routes
- **Frontend:** Audit schedule/register, findings list, link to NCR/CAPA

#### 4. MOD-13: Work Order / Job Traveler
- **DB tables:** `WorkOrder` (wo_number UNIQUE, customer, part_number, quantity), `JobStep` (step_type, sequence, performed_by, performed_at, sign_off)
- **API:** Create WO, list steps, sign-off endpoint
- **Frontend:** WO list, traveler form with step sign-off UI

#### 5. MOD-24: Certificate of Conformance
- **DB tables:** `CertificateOfConformance` (coc_number UNIQUE, work_order_id FK, issued_by, customer_name, standard_refs)
- **API:** Generate CoC from WO, approve, PDF-style print view
- **Frontend:** CoC list, generate modal, print-friendly CoC template

#### ~~6. MOD-25: User Management~~ ✅ DONE
- Frontend: `modules/mod25-users/index.html`
- Stubs: `api/v1/[...path].js` + `preview_server.py`

#### 7. MOD-15: KPI Dashboard
- **DB:** Aggregates from multiple modules
- **API:** Single `/api/v1/mod15/kpis` endpoint returning all KPIs
- **Frontend:** Dashboard with KPI grid sourcing from mod01, mod04, mod05, mod07 alerts

---

### 🔲 PENDING — P2 Modules
- MOD-12: Traceability & Lot Control
- MOD-17: MPT Process Control
- MOD-26: System Configuration

---

## Important Notes

### Seed Data Already In DB
**Personnel (MOD-04 migration 005):**
- James Tan Wei Liang (ATCA-001) — Level II, PT/MT/ET
- Hendrich Lim Jun Wei (ATCA-002) — Level II, PT/MT
- Cabal Lo Wen Xin (ATCA-003) — Level II, PT/FPI
- Gary Tan Beng Huat (ATCA-004) — Level I, PT
- Azman Bin Ayub (ATCA-005) — Level II, MPT
- Hariharan s/o Raju (ATCA-006) — Level II, PT/MT

**Equipment (MOD-05 migration 006):** 20 items including:
- UV lamps (UV-001 through UV-003), thermometers, pressure gauges, photometers, TAM panels, refractometers, etc.
- All with correct ATCA equipment codes, make/models, acceptance criteria from REAL_DATA sheet

### Alert Summary Endpoints (already built)
| Endpoint | Returns |
|----------|---------|
| `GET /api/v1/mod04/alerts/summary` | `{certs_expiring_90d, expired_certs, eye_expiring_60d, expired_eye_exams}` |
| `GET /api/v1/mod05/alerts/summary` | `{cal_overdue, cal_due_30d, never_calibrated, total}` |
| `GET /api/v1/mod07/alerts/summary` | `{open_ncr, overdue_capa, pending_verify, ncr_open_only, total}` |

### Global Alerts Polling
`ATCA.alerts.startPolling()` in `atca-core.js` polls `/api/v1/alerts/summary` every 5 min.
Module pages poll their own `/mod0X/alerts/summary` on load.

### Eye Exam Auto-calculation
NAS410 §9.3: expiry_date = exam_date + 12 months. Computed both server-side (personnel.routes.js POST /:id/eye-exams) and client-side (mod04 frontend JS).

### Calibration Due Date Auto-calculation
cal_due_date = cal_date + cal_interval_months. Computed server-side in calibrations.routes.js POST /.
Frontend also previews via equipment dropdown `change` event.

---

## File Structure (abbreviated)
```
ATCA-ERP/
├── src/
│   ├── backend/
│   │   ├── server.js                    ← Main entry, mounts all routes
│   │   ├── config/db.js                 ← SQL Server pool singleton
│   │   ├── middleware/auth.js           ← requireAuth, requireMinRole, auditLog
│   │   └── api/
│   │       ├── mod01/ (policy, objectives, risks, reviews, index)
│   │       ├── mod02/ (documents, retention, index)
│   │       ├── mod04/ (personnel, certifications, index)
│   │       ├── mod05/ (equipment, calibrations, index)
│   │       └── mod07/ (ncr, capa, index)
│   └── frontend/
│       ├── assets/
│       │   ├── css/ (bootstrap.min.css, atca-erp.css)
│       │   ├── js/ (bootstrap.bundle.min.js, atca-core.js)
│       │   └── fonts/ (bootstrap-icons.css + fonts)
│       ├── shared/layout.html           ← Template with {{SLOT_*}} placeholders
│       └── modules/
│           ├── mod01-qms-core/index.html
│           ├── mod02-doc-control/documents.html
│           ├── mod04-personnel/index.html
│           ├── mod05-equipment/index.html
│           └── mod07-ncr-capa/index.html
└── database/
    └── migrations/
        ├── 001_core_framework.sql
        ├── 002_mod01_qms_core.sql
        ├── 003_mod02_document_control.sql
        ├── 004_mod07_ncr_capa.sql
        ├── 005_mod04_personnel.sql
        └── 006_mod05_equipment.sql
```
