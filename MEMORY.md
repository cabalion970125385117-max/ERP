# ATCA-ERP Build Memory
ATC Aviation Pte Ltd | AS9100D | NADCAP AC7108 | NADCAP AC7110 | NADCAP AC7114 | NAS410
**Last updated:** 2026-06-16 — MOD-27 Value Flow Tracker BUILT (migration 028 grn_id FK on WorkOrder; api/mod27/index.js — alerts/summary, active-grns, flow/:grn_ref; frontend modules/mod27-value-flow/ — 8-stage clickable pipeline diagram + GRN typeahead lookup with live colour-coded stage status; preview-verified: KPIs, typeahead, flow render, node navigation all pass, 0 console errors; mounted in server.js; home card + sidebar nav added; AS9100D §8.5). Dev plan: MOD27-DEVPLAN.md. Earlier: MOD-25 User & Role Management backend BUILT (api/mod25/index.js: GET /users, POST /users, PUT /users/:id, POST /users/:id/reset-password, GET /alerts/summary; ADMIN mutations, QA_MANAGER+ view; mounted in server.js). **All 26 SoR modules 100% complete — no stubs remaining.** Earlier 2026-06-15: MOD-26 System Maintenance Console (SUPERUSER) BUILT — storage/activity-logs/users/password-control/backup + maintenance-mode toggle; ADMIN-gated (preview admin now role ADMIN). **All 26 SoR modules now built (0 inactive home cards).** Earlier same day: MOD-15 KPI Dashboard BUILT (cross-module health roll-up, AS9100D §9.1); fixed latent MOD-20 page crash (missing alerts/summary stub). Earlier 2026-06-15: UX & System QC Protocol run (TEST-PLAN v1.1 §13–14): 31/31 PASS after fixing 2 defects — Internal Chat broken (dead atca-erp.js ref → atca-core.js?v=4) + app-wide mojibake (double-encoded UTF-8 + BOM repaired across 39 files). Earlier 2026-06-15: Usability Pass — home nav rebuilt (all 27 linked, 0 broken), global ⌂ home button (3 layouts), ThreadingHTTPServer fix, cache-bust v=4. Prior (2026-06-14): App Improvement Pass — initPage crash fix, preview no-cache headers, stub field alignment, router seed data

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

## Compliance Standards in Scope

| Standard | Scope | Key Modules |
|----------|-------|-------------|
| **AS9100D** | Aerospace QMS — policy, objectives, risk, document control, audits, NCR/CAPA, CoC | MOD-01, MOD-02, MOD-07, MOD-08, MOD-24 |
| **NADCAP AC7108** | Coatings — organic/paint coating process control, bath chemistry, traveler sign-offs | MOD-06, MOD-13, MOD-05, MOD-04 |
| **NADCAP AC7110** | Chemical Processing — anodizing, plating, passivation, conversion coatings; bath titration/pH/temp controls | MOD-06, MOD-13, MOD-05 |
| **NADCAP AC7114** | NDT — FPI (ASTM E1417/AMS 2644) and MPT (ASTM E1444) process control; penetrant bath controls; UV/light calibration | MOD-03, MOD-06, MOD-17, MOD-05, MOD-04 |
| **NAS410** | NDT Personnel — Level I/II/III certification per method, 12-month eye exam (§9.3), training records | MOD-04 |

### Compliance → Module Matrix
| Module | AS9100D | AC7108 | AC7110 | AC7114 | NAS410 |
|--------|---------|--------|--------|--------|--------|
| MOD-01 QMS Core | §5.2, §6.1, §6.2, §9.3 | — | — | — | — |
| MOD-02 Doc Control | §7.5 | — | — | — | — |
| MOD-03 FPI Process | — | — | — | ASTM E1417, AMS 2644 | Inspector sign-off |
| MOD-04 Personnel | §7.2 | Operator qual | Operator qual | Inspector qual | Primary |
| MOD-05 Equipment & Cal | §7.1.5 | Oven/gauge cal | Titration/pH meter cal | UV lamp/photometer cal | — |
| MOD-06 Bath & Chemical | — | Coating bath | Tank chemistry | Penetrant bath | — |
| MOD-07 NCR & CAPA | §10.2 | — | — | — | — |
| MOD-08 Audit Mgmt | §9.2 | NADCAP prep | NADCAP prep | NADCAP prep | — |
| MOD-13 Work Order | §8.5 | Coating traveler | Process traveler | FPI/MPT traveler | Sign-off auth |
| MOD-17 MPT Process | — | — | — | ASTM E1444 | Inspector sign-off |
| MOD-24 CoC | §8.6 | Release cert | Release cert | Release cert | — |
| MOD-15 KPI Dashboard | §9.1 | — | — | — | — |

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
| `007_mod06_bath_control.sql` | MOD-06 | ChemicalBath, BathParameter, BathSample |
| `008_mod03_fpi_process.sql` | MOD-03 | FpiJob, FpiInspectionStep, FpiResult, Mod03Sequence |
| `013_mod08_audit_management.sql` | MOD-08 | AuditPlan, AuditFinding, AuditResponse, AuditChecklistItem, Mod08Sequence |
| `014_mod13_work_order.sql` | MOD-13 | WorkOrder, WoStep, WoDocument, WoNote, Mod13Sequence |
| `015_mod17_mpt_process.sql` | MOD-17 | MptJob, MptInspectionStep, MptResult, Mod17Sequence |
| `016_mod24_certificate_of_conformance.sql` | MOD-24 | CertificateOfConformance, CocLineItem, Mod24Sequence |
| `025_changelog.sql` | CHANGELOG | ChangeLog (seeded with 11 entries, v1.0.0–1.7.0) |
| `026_bugreport.sql` | BUGREPORT | BugReport (severity/status/resolution workflow) |
| `026_chat.sql` | CHAT | ChatRoom (DIRECT/GROUP), ChatParticipant (UNIQUE room+user), ChatMessage (body, sent_at, is_deleted) |
| `027_user_signature.sql` | SIGNATURE | ALTER Users ADD signature_data NVARCHAR(MAX), signature_updated_at DATETIME2 |
| `028_mod27_value_flow.sql` | MOD-27 | ALTER WorkOrder ADD grn_id INT FK→GoodsReceivingNote + IX_WorkOrder_GrnId; backfill from order_reference (idempotent) |
| `017_mod11_maintenance.sql` | MOD-11 | MaintenanceAsset (MA-), PmSchedule, MaintenanceRecord, WorkPermit (WP-), Mod11Sequence |
| `018_mod12_purchasing.sql` | MOD-12 | Supplier (SUP-), PurchaseRequisition (PR-), PurchaseOrder (PO-), Mod12Sequence |
| `019_mod14_inventory.sql` | MOD-14 | InventoryItem (INV-), InventoryMovement, StockCount, StockCountLine, Mod14Sequence |
| `020_mod18_hr_management.sql` | MOD-18 | OrgEntity (seed: ATC Aviation), StaffRecord (EMP-NNNN), Mod18Sequence |
| `021_mod21_communications.sql` | MOD-21 | Announcement, AnnouncementAck (UNIQUE constraint), Mod21Sequence |
| `022_mod22_leave_attendance.sql` | MOD-22 | LeaveType (5 seeded), LeaveRequest, AttendanceRecord (UNIQUE staff+date), Mod22Sequence |
| `023_mod23_payroll.sql` | MOD-23 | PayrollRun, PayrollLine, Mod23Sequence |
| `024_mod16_finance.sql` | MOD-16 | Account (13 seeded), JournalEntry (JE-), JournalLine, ArInvoice (INV-), ApInvoice, FixedAsset, Budget, Mod16Sequence |

#### Backend API Routes
| Path | Module | Notes |
|------|--------|-------|
| `api/mod01/` | MOD-01 | policy, objectives, risks, reviews |
| `api/mod02/` | MOD-02 | documents, retention |
| `api/mod04/` | MOD-04 | personnel (+ eye-exams, training sub-routes), certifications |
| `api/mod05/` | MOD-05 | equipment, calibrations |
| `api/mod07/` | MOD-07 | ncr, capa |
| `api/mod03/` | MOD-03 | fpi (jobs, steps, results, traveler) |
| `api/mod06/` | MOD-06 | baths (register, parameters, samples) |
| `api/mod08/` | MOD-08 | audit-plans, findings, responses, verify |
| `api/mod13/` | MOD-13 | work-orders, steps, documents, notes |
| `api/mod17/` | MOD-17 | mpt-jobs, inspection-steps, results |
| `api/mod24/` | MOD-24 | cocs (draft, issue, void) |
| `api/maintenance/` | MOD-11 | assets.routes, schedules.routes, permits.routes |
| `api/purchasing/` | MOD-12 | suppliers.routes, requisitions.routes, purchase-orders.routes |
| `api/inventory/` | MOD-14 | inventory-items.routes, movements.routes |
| `api/finance/` | MOD-16 | ar.routes, ap.routes, journal.routes; /accounts, /fixed-assets, /budget |
| `api/hr-management/` | MOD-18 | staff.routes, org.routes |
| `api/communications/` | MOD-21 | all routes inline; per-user acknowledgement |
| `api/leave-attendance/` | MOD-22 | all routes inline; leave-requests, leave-types, approve |
| `api/payroll/` | MOD-23 | all routes inline; runs, approve (QA_MANAGER), disburse (ADMIN) |
| `api/changelog/` | CHANGELOG | GET /alerts/summary, GET /entries, POST /entries (requireMinRole ENGINEER) |
| `api/bugreport/` | BUGREPORT | GET /alerts/summary, GET /bugs, POST /bugs (any auth), PATCH /bugs/:id/resolve (SUPERVISOR+) |
| `api/chat/` | CHAT | GET /users, GET /rooms, POST /rooms, GET /rooms/:id/messages?since=, POST /rooms/:id/messages, DELETE /rooms/:id/messages/:mid |
| `api/mod25/` | MOD-25 | GET /alerts/summary (QA_MANAGER+), GET /users (QA_MANAGER+), POST /users (ADMIN), PUT /users/:id (ADMIN), POST /users/:id/reset-password (ADMIN) |
| `api/mod27/` | MOD-27 | GET /alerts/summary, GET /active-grns?q=, GET /flow/:grn_ref — all requireMinRole('NDT_INSPECTOR'); read-only; resolves GRN→WO→CR/FPI/MPT/CoC/DO chain + open NCR block detection |
| `server.js auth` | SIGNATURE | PATCH /auth/signature (self), GET /auth/signature (self), GET /auth/signature/:userId (any), PATCH /auth/signature/admin/:userId (ADMIN only) |
| `server.js` | Core | Mounts mod01–08, mod11–14, mod16–18, mod21–25, mod27, changelog, bugreport, chat; GET /login; GET /logout |

#### ATCA Core JS Additions (atca-core.js)
- `ATCA.tooltips.init()` — scans `[data-compliance]`, `[data-linked]`, `[data-action-desc]` attributes, creates Bootstrap Popovers on hover
- `ATCA.user.current()` — returns `ATCA.currentUser`
- `ATCA.toast(msg, type)` — top-level alias for `ATCA.utils.toast()`
- `ATCA.initPage()` now calls `setTimeout(() => ATCA.tooltips.init(), 200)` after session init

#### Compliance Tooltip Protocol
All action buttons system-wide have three data attributes:
- `data-action-desc` — what the button does and prerequisites
- `data-compliance` — compliance clause references (AS9100D §, AC7108/10/14 §, NAS410 §)
- `data-linked` — other modules affected by this action

Covered: MOD-02, MOD-03, MOD-04, MOD-05, MOD-06, MOD-07 (all action + modal save buttons)

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
| `modules/mod06-bath-control/index.html` | MOD-06 | Done — bath register, RAG status, sample recording, out-of-spec workflow |
| `modules/mod03-fpi-process/index.html` | MOD-03 | Done — job list, 8-step traveler, sign-off, final disposition |
| `modules/mod25-user-management/index.html` | MOD-25 | ✅ Done 2026-06-15 — User list (QA_MANAGER+ view), Create/Edit/Reset-password (ADMIN), Signature modal, KPI tiles; backend api/mod25/index.js mounted |
| `user-guide.html` | System | Done — full user manual: all modules, compliance refs, workflows, role table, NADCAP/NAS410 clause index |
| `modules/mod09-sales-customer-service/index.html` | MOD-09 | ✅ Done — Customers, Part Master, Quotations, Contract Reviews, GRN, Delivery Orders |
| `modules/mod20-customer-complaint/index.html` | MOD-20 | ✅ Done — Complaint register, 8D Report (D1–D8 step-by-step workflow, approve/close) |
| `modules/mod10-production-management/index.html` | MOD-10 | ✅ Done — Route Cards, Production Conditions (AC7108 App D), Test Pieces, Shift Checklists |
| `modules/mod19-extended-laboratory/index.html` | MOD-19 | ✅ Done — Analysis Schedules, Results, Chemical Inventory + SDS/MSDS, Lab Validations, External Labs, External Lab Jobs |
| `modules/mod08-audit-management/index.html` | MOD-08 | ✅ Done — Audit Plans (INTERNAL/NADCAP/CUSTOMER/SUPPLIER), Findings Register (raise, respond, verify), AS9100D §9.2 |
| `modules/mod13-work-order/index.html` | MOD-13 | ✅ Done — Work Order register, Job Traveler with step sign-off, status advance, priority tracking |
| `modules/mod17-mpt-process/index.html` | MOD-17 | ✅ Done — MPT Job register, 6-step AC7114 process traveler, step measurements, final result/disposition |
| `modules/mod24-certificate-of-conformance/index.html` | MOD-24 | ✅ Done — CoC list, draft/issue/void workflow, printable CoC template, multi-process flags |
| `modules/mod11-maintenance/index.html` | MOD-11 | ✅ Done — Asset Register, PM Schedule (RAG DUE_SOON/OVERDUE/OK), Work Permits, completeSchedule/activatePermit/closePermit |
| `modules/mod12-purchasing/index.html` | MOD-12 | ✅ Done — Supplier/AVL register, PRs, POs, accreditation expiry highlight, suspendSupplier/approvePr/issuePo |
| `modules/mod14-inventory/index.html` | MOD-14 | ✅ Done — Inventory Register with RAG kanban, Stock Movements, quickReceipt, hazardous flag |
| `modules/mod16-finance/index.html` | MOD-16 | ✅ Done — AR Invoices, AP Invoices, Journal Entries, Chart of Accounts (13 seeded) |
| `modules/mod18-hr-management/index.html` | MOD-18 | ✅ Done — Staff Register, Org Structure, markOnboarding, COI tracking |
| `modules/mod21-communications/index.html` | MOD-21 | ✅ Done — Card-based announcement board, priority badges, per-card Acknowledge button |
| `modules/mod22-leave-attendance/index.html` | MOD-22 | ✅ Done — Leave Requests (approve/reject), Leave Types, attendance KPIs |
| `modules/mod23-payroll/index.html` | MOD-23 | ✅ Done — Payroll Runs list, Run Detail with PayrollLines (CPF), approveRun/disburseRun |
| `modules/mod-changelog/index.html` | CHANGELOG | ✅ Done — Version log table; FEATURE/BUGFIX/MIGRATION/CONFIG/SECURITY badges; filter by category; New Entry modal |
| `modules/mod-bugreport/index.html` | BUGREPORT | ✅ Done — Bug table sorted by severity; CRITICAL/HIGH/MEDIUM/LOW badges; status filter; Report Bug modal; Resolve modal (SUPERVISOR+) |
| `modules/mod-chat/index.html` | CHAT | ✅ Done — WhatsApp-style layout; sidebar room list with preview; DIRECT/GROUP rooms; 3s polling; soft-delete messages; New DM/Group modal (loads atca-core.js?v=4 since 2026-06-15)
| `modules/mod15-dashboard/index.html` | MOD-15 | ✅ Done 2026-06-15 — Cross-module KPI roll-up; compliance health ring; 4 domain cards; prioritized Attention list; 18-chip status matrix; aggregates all `/modXX/alerts/summary` client-side; AS9100D §9.1
| `modules/mod26-maintenance/index.html` | MOD-26 | ✅ Done 2026-06-15 — Superuser Maintenance Console (ADMIN-gated); tabs Storage/Activity Logs/Users/Password Control/Backup + Maintenance Mode toggle; stubs under `/api/v1/admin/*` + `/mod26/alerts/summary`; preview admin role set to ADMIN |
| `modules/mod27-value-flow/index.html` | MOD-27 | ✅ Done 2026-06-16 — Layout A; 8-stage clickable pipeline diagram (PO/CR→GRN→WO→Production→NDT FPI/MPT→QA→CoC→DO); GRN typeahead lookup colours each stage live (pending/active/waiting/complete/blocked); NDT node has FPI(MOD-03)/MPT(MOD-17) sub-pills; nodes navigate to owning module; KPI tiles; preview-verified |
| `modules/mod25-user-management/index.html` | MOD-25 | ✅ Updated — added Signature Upload modal; pen icon per user (admin); view/upload signature; admin endpoint PATCH /auth/signature/admin/:userId |
| `user-guide.html` | System | ✅ Updated v1.8 — added all Phase 2–8 modules (MOD-01,08–24), Signature Upload, Internal Chat, Change Log, Bug Report sections; expanded sidebar TOC |

---

## SoR Alignment — Specification of Requirements Rev. 1.0 (9 June 2026)

Source: `SoR_ERP_Rev1_0.pdf` — Prepared by Leong | Scope: AS9100D | NADCAP AC7108

### SoR Gap Analysis — Built vs Required

| SoR Section | Domain | Built? | Gap / Notes |
|-------------|--------|--------|-------------|
| §1 | General (cross-cutting) | Partial | Missing: multi-entity, e-sig, AAM register, alert escalation, frozen process items, multi-currency |
| §2 | Document Control | Partial | Missing: ECN workflow, Distribution & Acknowledgement, external doc control, FMEA register, print control, AAM register, template/rule engine |
| §3 | Calibration & Verification | Partial | Missing: external cal provider register, out-of-tolerance impact analysis, NADCAP chem processing equipment sub-register |
| §4 | Sales & Customer Service | ❌ None | Customer mgmt, Part Master/BOM, Quotation, Contract Review, GRN, Work Order, Delivery Order, WO tracking |
| §5 | Production | Partial (FPI only) | Missing: Production Dashboard, operator PIN flow, Route Card, Production Condition (AC7108 App D), coupon/test piece records, start/end shift checklists |
| §6 | Quality | Partial | Missing: IQA/OQA full flow, customer complaint + 8D report, quality dashboard |
| §7 | Laboratory | Partial | Missing: analysis schedule, chemical inventory + SDS, validation records, external lab management |
| §8 | Maintenance | ❌ None | PM schedule, maintenance records, work permits, external service providers, spare part inventory |
| §9 | Purchasing | ❌ None | Supplier/AVL, PR, PO with flowdown, inventory management, sourcing, order tracking |
| §10 | Inventory | ❌ None | Inventory master, item requests, stock transfer, stock count, kanban |
| §11 | Finance | ❌ None | GL, AR/AP, cost accounting, asset management, budget, custom reports |
| §12 | Org & Staff | Partial | Missing: org chart, staff master, leave management, payroll, communication/announcement module, HR integration |
| §13 | Supplier SLA | ❌ None | Uptime guarantee, RTO/RPO, offline mode — implementation-level, not app-module |

---

## Module Registry (SoR-Aligned)

| MOD | Name | SoR Section | Status |
|-----|------|-------------|--------|
| MOD-01 | QMS Core (Policy, Objectives, Risk, Mgmt Review) | §1, §6 | ✅ BUILT |
| MOD-02 | Document Control | §2 | ✅ BUILT (gaps: ECN, e-sig, FMEA, external docs) |
| MOD-03 | FPI Process Control | §5 NDT | ✅ BUILT |
| MOD-04 | Personnel & NAS410 Qualifications | §5, §12 | ✅ BUILT |
| MOD-05 | Equipment & Calibration | §3 | ✅ BUILT (gaps: OOT impact analysis, ext. cal providers) |
| MOD-06 | Chemical Bath Control (Lab Analysis) | §5, §7 | ✅ BUILT (gaps: analysis schedule, chemical inventory) |
| MOD-07 | NCR & CAPA | §6 | ✅ BUILT |
| MOD-08 | Audit Management | §6 | ✅ BUILT — Phase 2 |
| MOD-09 | Sales & Customer Service (CRM → GRN → WO → DO) | §4 | ✅ BUILT — Phase 3 |
| MOD-10 | Production Management (Route Card, Prod Condition, Checklists) | §5 | ✅ BUILT — Phase 4 |
| MOD-11 | Maintenance (PM, Work Permit, Spare Parts) | §8 | ✅ BUILT — Phase 5 |
| MOD-12 | Purchasing & Supplier/AVL Management | §9 | ✅ BUILT — Phase 5 |
| MOD-13 | Work Order / Job Traveler (NDT-specific) | §4 WO, §5 | ✅ BUILT — Phase 2 |
| MOD-14 | Inventory Management | §10 | ✅ BUILT — Phase 5 |
| MOD-15 | KPI Dashboard (aggregate, all domains) | All | ✅ BUILT — 2026-06-15 |
| MOD-16 | Finance (GL, AR/AP, Cost, Assets, Budget) | §11 | ✅ BUILT — Phase 7 |
| MOD-17 | MPT Process Control | §5 NDT | ✅ BUILT — Phase 2 |
| MOD-18 | Organisation & HR Management | §12 | ✅ BUILT — Phase 6 |
| MOD-19 | Extended Laboratory (schedule, validation, ext. labs) | §7 | ✅ BUILT — Phase 4 |
| MOD-20 | Customer Complaint & 8D Report | §6 | ✅ BUILT — Phase 3 |
| MOD-21 | Communication & Announcement | §12 | ✅ BUILT — Phase 6 |
| MOD-22 | Leave & Attendance Management | §12 | ✅ BUILT — Phase 6 |
| MOD-23 | Payroll Processing | §12 | ✅ BUILT — Phase 6 |
| MOD-24 | Certificate of Conformance | §4, §6 | ✅ BUILT — Phase 2 |
| MOD-25 | User & Role Management | §12 | ✅ BUILT 2026-06-15 — full backend + frontend; ADMIN mutations, QA_MANAGER+ view, signature upload |
| MOD-26 | System Maintenance Console (Superuser) | §1 | ✅ BUILT — 2026-06-15 (storage/logs/users/password/backup + maintenance mode) |
| MOD-27 | Value Flow Tracker (PO→GRN→WO→NDT→COC→DO) | §4, §8.5 | ✅ BUILT — 2026-06-16 (8-stage clickable pipeline diagram + GRN lookup; read-only; AS9100D §8.5; dev plan: MOD27-DEVPLAN.md) |

---

## Development Plan (Revised — SoR Rev. 1.0)

### Phase 1 — NDT Process Control Core ✅ COMPLETE
> All modules built, tested, preview-ready.

| MOD | Module | Key Deliverables |
|-----|--------|-----------------|
| MOD-01 | QMS Core | Policy, objectives, risk register, management review |
| MOD-02 | Document Control | Document register, revision, retention |
| MOD-03 | FPI Process Control | 8-step traveler (ASTM E1417), sign-off, disposition |
| MOD-04 | Personnel & NAS410 | Certifications, eye exams, qualifications |
| MOD-05 | Equipment & Calibration | Equipment register, calibration records, due alerts |
| MOD-06 | Chemical Bath Control | Bath register, RAG sampling, out-of-spec workflow |
| MOD-07 | NCR & CAPA | Non-conformance, root cause, corrective actions |

---

### Phase 2 — Audit, Traveler & CoC ✅ COMPLETE

#### MOD-08: Audit Management
**SoR §6** · **Compliance:** AS9100D §9.2, NADCAP audit preparation
- **DB tables:** `Audit` (ref, type, scheduled_date, lead_auditor, status), `AuditFinding` (ref, clause, severity OB/MN/MJ/NC, linked_ncr_id, status), `AuditResponse` (response per finding)
- **API:** Full CRUD + findings sub-routes + GET /alerts/summary `{open_findings, overdue_findings, upcoming_audits}`
- **Frontend:** Audit schedule calendar, finding register with RAG severity, response tracking, NCR auto-link
- **Key rules:** Major finding must trigger NCR; finding closure requires evidence attachment; NADCAP audit type flags checklist compliance items

#### MOD-13: Work Order / Job Traveler
**SoR §4 (Work Order Management)** · **Compliance:** AS9100D §8.5, AC7108, AC7110, AC7114, NAS410
- **DB tables:** `WorkOrder` (wo_number auto, grn_id FK, part_id FK, customer_id FK, process_type, status, qty_in, qty_out, fa_flag), `WoStep` (seq, module_ref, assigned_to, completed_by, result, signed_off), `WoDocument` (doc_type, file_ref)
- **API:** POST /work-orders (auto-generate from GRN stub), GET list + detail, POST /steps/:seq/complete, GET /traveler, GET /alerts/summary
- **Frontend:** WO register with status pipeline, traveler view linking MOD-03/MOD-06/MOD-17 steps, sign-off UI, barcode display

#### MOD-24: Certificate of Conformance
**SoR §4 (Delivery Order)** · **Compliance:** AS9100D §8.6, AC7108, AC7110, AC7114
- **DB tables:** `CertificateOfConformance` (coc_number auto, wo_id FK, issued_by FK, approved_by FK, customer, part_number, qty, process_performed, standard_refs, status DRAFT/APPROVED/VOIDED)
- **API:** POST /coc (generate from WO), PUT /coc/:id/approve, GET /coc/:id/print
- **Frontend:** CoC list, generate-from-WO modal, print-friendly template with all compliance clause references

#### MOD-17: MPT Process Control
**SoR §5 (NDT)** · **Compliance:** NADCAP AC7114, ASTM E1444, NAS410
- **DB tables:** `MptJob`, `MptInspectionStep`, `MptResult` — mirror structure of MOD-03
- **Steps:** PRE_CLEAN → MAGNETIZE → APPLY_PARTICLES → INSPECT → DEMAGNETIZE → POST_CLEAN (6 steps)
- Links to MOD-05 (gaussmeter, ammeter calibration) and MOD-04 (NAS410 MT cert check)

---

### Phase 3 — Sales, Customer & Operations ✅ COMPLETE

#### MOD-09: Sales & Customer Service
**SoR §4** · **Compliance:** AS9100D §8.2, §8.2.3
- **Sub-modules and DB tables:**
  - **Customer Management:** `Customer` (name, address, approval_status, safety_critical_flag, export_control_flag, quality_clauses)
  - **Part Master:** `Part` (part_number auto, customer_part_number, description, revision, fa_flag, safety_critical_flag, itar_flag, approved_process), `PartBom` (component, material, chemical, qty, unit)
  - **Quotation:** `Quotation` (rfq_ref, customer_id, part_id, drawing_rev, qty, unit_price, lead_time, status DRAFT/SENT/AWARDED/LOST)
  - **Contract Review:** `ContractReview` (po_number, quotation_id, cross_dept_sign_off, status PENDING/APPROVED/REJECTED)
  - **GRN:** `GoodsReceivingNote` (grn_number auto, contract_review_id, customer_do, line_items[], fod_checklist_done, counterfeit_check_done, status)
  - **Delivery Order:** `DeliveryOrder` (do_number auto, wo_id, qty_shipped, method, status, invoice_generated)
- **Key rules:** GRN blocked until FOD checklist + counterfeit check signed off; all parts tagged with GRN ref; suspected counterfeit triggers NCR automatically; contract review requires 3-dept electronic sign-off (sales, quality, production)

#### MOD-20: Customer Complaint & 8D Report
**SoR §6** · **Compliance:** AS9100D §10.2, §9.1.2
- **DB tables:** `CustomerComplaint` (complaint_ref, customer_id, date_received, description, linked_ncr_id, status), `EightDReport` (complaint_id, D1_team, D2_problem, D3_containment, D4_root_cause, D5_corrective_action, D6_implementation, D7_prevention, D8_recognition, status)
- **Frontend:** Complaint register, 8D form with all eight disciplines, exportable report, satisfaction score tracking

---

### Phase 4 — Production & Laboratory ✅ COMPLETE

#### MOD-10: Production Management
**SoR §5** · **Compliance:** AS9100D §8.5.1, AC7108 (Appendix D), AC7110
- **Sub-modules:**
  - **Route Card:** controlled document per process type — document control workflow applies
  - **Production Condition:** `ProductionCondition` (pc_id, bath_id FK, param_name, recording_method AUTO/MANUAL, min_val, max_val, recorded_value, recorded_by PIN, recorded_at) — real-time parameter recording per AC7108 App D
  - **Production Input/Output:** operator PIN scan at start/end of each stage, qty_in vs qty_out reconciliation, discrepancy triggers NCR
  - **Coupon/Test Piece:** `TestPiece` (tp_id, unique_id, material, dimensions, batch_lot, test_type, result, test_date, retest_log)
  - **Start/End Shift Checklist:** `ShiftChecklist` (checklist_id, process_line, shift, type START/END, items[], signed_by PIN, signed_at)
- **Key rules:** Operator PIN required (non-transferable); unqualified operator blocked per MOD-04; FOD checkbox mandatory at each stage transition; out-of-range parameter alerts and links to NCR

#### MOD-19: Extended Laboratory Management
**SoR §7** · **Compliance:** NADCAP AC7108, AC7110
- **Sub-modules (extends MOD-06):**
  - **Chemical Analysis Schedule:** `AnalysisSchedule` (bath_id, analysis_type, frequency_days, next_due, last_completed, status) — separate from sampling schedule
  - **Chemical Inventory:** `ChemicalInventory` (chem_id, name, supplier, lot_number, quantity, unit, location, sds_ref, shelf_life_expiry, is_hazardous) — FIFO, SDS/MSDS linked
  - **Validation Record:** `LabValidationRecord` (method_name, validation_date, equipment_id FK→MOD-05, status VALID/DUE/EXPIRED, evidence_ref)
  - **External Lab Management:** `ExternalLab` (lab_name, accreditation_body, scope, expiry, status) — only accredited labs assignable

---

### Phase 5 — Maintenance & Supply Chain ✅ COMPLETE

#### MOD-11: Maintenance
**SoR §8** · **Compliance:** AS9100D §7.1.3, NADCAP equipment control
- **DB tables:** `MaintenanceEquipment` (separate from MOD-05 — production, facility, lab, rectifier, auto process line), `PmSchedule` (frequency, next_due, nadcap_flag), `MaintenanceRecord` (type PM/CM, performed_by, outcome, downtime_mins, root_cause), `WorkPermit` (hazard_id, safety_precautions, authorised_by, status)
- **Key rules:** Calibrated equipment maintenance triggers recalibration check; post-maintenance verification sign-off required; breakdown during production triggers product impact assessment → NCR if required

#### MOD-12: Purchasing & Supplier Management
**SoR §9** · **Compliance:** AS9100D §8.4
- **DB tables:** `Supplier` (approval_status APPROVED/CONDITIONAL/SUSPENDED/BLACKLISTED, avl_scope, accreditation, expiry, performance_history), `PurchaseRequisition` (raised_by, item_id FK, qty, required_date, status), `PurchaseOrder` (supplier_id FK, line_items[], flowdown_requirements, status)
- **Key rules:** Only approved AVL suppliers assignable to POs; counterfeit prevention flowdown for aerospace items; customer-directed sources flagged — no substitution without written approval; right-of-access clause recorded

#### MOD-14: Inventory Management
**SoR §10** · **Compliance:** AS9100D §8.5.4 (customer property), §7.1.4
- **DB tables:** `InventoryItem` (unique_id, category, unit, location, storage_conditions, hazardous_flag, incompatible_materials), `InventoryMovement` (movement_type RECEIPT/REQUEST/TRANSFER/DISPOSAL, qty, lot, linked_wo_id, fifo_batch), `StockCount` (count_date, counted_by, discrepancies[])
- **Frontend:** Kanban view per category (green/yellow/red cards), item request workflow, inter-entity stock transfer, quarterly count sheet

---

### Phase 6 — Organisation & HR ✅ COMPLETE

#### MOD-18: Organisation & HR Management
**SoR §12** · **Compliance:** AS9100D §7.2, §7.3
- **DB tables:** `OrgEntity` (entity, division, department, team — hierarchy), `StaffRecord` (staff_id, entity, department, job_role, employment_date, status, onboarding_checklist, conflict_of_interest_date), `OrgChart` (auto-generated from structure)
- Links to MOD-04 (NDT qualifications), MOD-25 (role/permission), MOD-04 (competency/training)

#### MOD-22: Leave & Attendance
**SoR §12**
- **DB tables:** `LeaveRequest` (staff_id, type, start_date, end_date, status, approved_by), `AttendanceRecord` (staff_id, date, status PRESENT/LEAVE/ABSENT)
- **Frontend:** Leave application from any dashboard, calendar view, understaffed department alert; attendance status strip visible across all domain dashboards

#### MOD-21: Communication & Announcement
**SoR §12** · **Compliance:** AS9100D §7.3, §7.4
- **DB tables:** `Announcement` (title, body, linked_doc_id, target_roles[], published_by, published_at), `AnnouncementAck` (staff_id, acknowledged_at)
- Quality policy and objectives communicated; acknowledgement tracked per staff member

#### MOD-23: Payroll Processing
**SoR §12**
- Driven by MOD-22 attendance + leave + overtime records
- Cost posted to MOD-16 Finance General Ledger
- Multiple pay structures per entity; approval workflow before disbursement

---

### Phase 7 — Finance ✅ COMPLETE

#### MOD-16: Finance
**SoR §11** · **Compliance:** AS9100D §7.1.1 (resources)
- **Sub-modules:**
  - **Chart of Accounts & GL:** multi-entity consolidation, journal entry approval, period-end closing
  - **Accounts Payable:** supplier invoices linked to PO, 3-way matching, overdue alerts
  - **Accounts Receivable:** invoice auto-generated on DO completion, payment terms, credit note
  - **Cost Accounting:** total cost per WO (labour, material, chemical, process, overhead, external), actual vs estimate variance
  - **Asset Management:** fixed asset register, depreciation (auto or manual), asset status
  - **Budget Management:** annual budget per dept/cost centre/entity, actual vs budget real-time
  - **Custom Report Module:** P&L, balance sheet, cash flow — scheduled generation, exportable PDF/Excel
- **Finance Dashboard:** revenue, expenses, receivables, payables, budget utilisation; overdue and overspend alerts

---

### Phase 8 — Platform Enhancements (Cross-Cutting)

#### Compliance Gaps — CLOSED (2026-06-14)
| Gap | SoR Ref | File | Fix |
|-----|---------|------|-----|
| GAP-01: JE balance check (debit = credit) | §11 / AS9100D §7.1.1 | `finance/journal.routes.js` | 400 if `totalDebit ≠ totalCredit` (within 0.005 tolerance) |
| GAP-02: PO/AVL gate (APPROVED suppliers only) | §9 / AS9100D §8.4 | `purchasing/purchase-orders.routes.js` | 422 if supplier status ≠ APPROVED |
| GAP-03: CoC re-issue after void prevention | §6 / AS9100D §8.6 | `certificate-of-conformance/coc.routes.js` | 400 with explicit message if status = VOID or ISSUED |
| GAP-04: FPI sequential step gate | §5 / ASTM E1417 §8 | `fpi-process/fpi-inspection.routes.js` | 400 if previous step not signed off |
| GAP-05: OOT equipment withdrawal | §3 / AS9100D §7.1.5 | `equipment-calibration/calibrations.routes.js` | Equipment status = WITHDRAWN when out_of_tolerance = true |
| GAP-06: NAS410 PT cert check at FPI sign-off | NAS410 §9.1 / NADCAP AC7114 | `fpi-process/fpi-inspection.routes.js` | 403 if user has no active PT certification |

#### Remaining — Phase 8 To-Do
| Feature | SoR Ref | Priority | Notes |
|---------|---------|----------|-------|
| MPT MT cert check at step sign-off | NAS410 §9.1 / NADCAP AC7114 | HIGH | Same pattern as GAP-06 but for MT method in `mpt-jobs.routes.js` |
| MOD-25 User Management Backend | §12 | HIGH | Complete backend CRUD for user accounts and role assignment |
| MOD-15 KPI Dashboard | §6, all | MEDIUM | Aggregate all module alerts/KPIs; customisable widgets; role-based views |
| MOD-26 System Configuration | §1 | MEDIUM | Spec refs, process params, intervals, retention periods, rule engine config |
| Electronic Signature | §1 | HIGH | Non-transferable, timestamped, linked to AAM — required for NADCAP compliance |
| AAM Register | §2 | HIGH | Authorised personnel, scope, sign-off method — changes logged |
| Multi-entity structure | §1 | HIGH | All records tagged to entity; access controlled per entity + role |
| Document Template & Rule Engine | §2 | MEDIUM | Auto-generate docs per trigger + product category; configurable by admin |
| Document Distribution & Acknowledgement | §2 | MEDIUM | Release notification + e-sig acknowledgement; outstanding items escalated |
| ECN (Engineering Change Notice) | §2 | MEDIUM | Triggers when change impacts process/product/drawing/spec; customer notification |
| Frozen Process Item Control | §1 | MEDIUM | Written customer approval required before any change; system blocks until both approvals done |
| Alert Escalation Engine | §1 | MEDIUM | Configurable escalation paths and timeframes per module |
| FMEA Register | §2 | LOW | Linked to Route Card and Production Condition |
| External Document Control | §2 | MEDIUM | Customer specs, industry standards, regulatory docs — separate sub-module |
| Multi-currency Support | §1 | LOW | Required for Finance module |
| External API Integration | §1 | LOW | Finance software + BI tool integration |
| Offline/Local Mode | §13 | LOW | Critical modules accessible during server outage |

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
| `GET /api/v1/mod04/alerts/summary` | `{certs_expiring_90d, expired_certs, eye_expiring_60d, expired_eye_exams, total}` |
| `GET /api/v1/mod05/alerts/summary` | `{cal_overdue, cal_due_30d, never_calibrated, total}` |
| `GET /api/v1/mod07/alerts/summary` | `{open_ncr, overdue_capa, pending_verify, ncr_open_only, total}` |

### Alert Summary Endpoints (built — MOD-06 & MOD-03)
| Endpoint | Returns |
|----------|---------|
| `GET /api/v1/mod06/alerts/summary` | `{out_of_spec, overdue_sample, due_soon, total_baths, total}` |
| `GET /api/v1/mod03/alerts/summary` | `{in_progress, pending_signoff, rejected, total}` |

### Alert Summary Endpoints (Phase 2 — built)
| Endpoint | Returns |
|----------|---------|
| `GET /api/v1/mod08/alerts/summary` | `{planned_audits, open_findings, overdue_findings, pending_verification}` |
| `GET /api/v1/mod13/alerts/summary` | `{active_jobs, overdue_jobs, pending_qa, coc_pending}` |
| `GET /api/v1/mod17/alerts/summary` | `{active_jobs, pending_review, overdue, rejected_this_month}` |
| `GET /api/v1/mod24/alerts/summary` | `{draft_cocs, issued_cocs, pending_coc, voided_cocs}` |

### Alert Summary Endpoints (Phases 5–7 — built)
| Endpoint | Returns |
|----------|---------|
| `GET /api/v1/mod11/alerts/summary` | `{due_this_week, overdue_pm, open_permits, active_breakdowns}` |
| `GET /api/v1/mod12/alerts/summary` | `{approved_suppliers, pending_pr, open_po, expiring_accreditations}` |
| `GET /api/v1/mod14/alerts/summary` | `{low_stock, out_of_stock, expiring_chemicals, total_items}` |
| `GET /api/v1/mod16/alerts/summary` | `{ar_outstanding, overdue_invoices, ap_outstanding, pending_payroll_runs}` |
| `GET /api/v1/mod18/alerts/summary` | `{total_staff, new_this_month, pending_onboarding, conflict_declarations_due}` |
| `GET /api/v1/mod21/alerts/summary` | `{active_announcements, unacknowledged, urgent_count, expired_this_week}` (user-specific) |
| `GET /api/v1/mod22/alerts/summary` | `{pending_requests, on_leave_today, absent_today, low_balance_staff}` |
| `GET /api/v1/mod23/alerts/summary` | `{pending_runs, current_month_gross, staff_paid, runs_disbursed_ytd}` |
| `GET /api/v1/changelog/alerts/summary` | `{total_entries, entries_this_month, feature_count, bugfix_count}` |
| `GET /api/v1/bugreport/alerts/summary` | `{open_bugs, critical_bugs, resolved_this_month, avg_resolution_days}` |

### Global Alerts Polling
`ATCA.alerts.startPolling()` in `atca-core.js` polls `/api/v1/alerts/summary` every 5 min.
Module pages poll their own `/mod0X/alerts/summary` on load.

### Page Initialisation Pattern
`atca-core.js` exposes `ATCA.initPage()` — a singleton promise that runs clock, sidebar, user.load(), alerts polling, and session exactly once per page regardless of how many callers await it.
Each page's DOMContentLoaded (or IIFE) must call `await ATCA.initPage()` as its first step.
The auto-init in atca-core.js also calls `ATCA.initPage()` on DOMContentLoaded as a fallback for pages that have no page-specific code.
Do NOT call the individual methods (user.load, clock.start, etc.) directly from page scripts — always go through `ATCA.initPage()`.

### ATCA.api Methods
`get`, `post`, `put`, `patch`, `delete` — all return null on 401/403/network error and show a toast.

---

## Dev Log

### 2026-06-15 — MOD-26 System Maintenance Console / Superuser Mode (new feature, preview-verified)
**Feature:** the last unbuilt SoR module — a **superuser (ADMIN-only) Maintenance Console** at `modules/mod26-maintenance/index.html` (Layout C → auto home button). Replaces the old `mod26-config` placeholder; home card + sidebar link repointed & activated. **All 26 SoR modules are now built — 0 inactive cards on the home page.**

**Built (preview, stubbed backend):**
- **Superuser gate** — `if (!ATCA.user.hasRole('ADMIN')) show access-denied`. To make it testable, the preview `auth/me` + login role was changed `QA_MANAGER → ADMIN` (the preview "admin" account is the superuser identity). Non-admins get a "Superuser Access Required" panel.
- **Maintenance Mode toggle** — superuser switch; ON shows an app-wide red lockout banner ("non-admin users are locked out") and reddens the mode card; `PATCH /admin/maintenance`. Confirm-gated.
- **Storage dashboard** — DB capacity bars (data/log/disk with RAG), largest-tables breakdown with share bars, file-storage pills (signatures/documents/backups/attachments). `GET /admin/storage`.
- **Activity Logs** — audit-log viewer (10 of 184,213): user/role, colour-coded action (LOGIN/SIGNOFF/ISSUE/ROLE_CHANGE/LOGIN_FAIL/BACKUP…), module, detail, LAN IP; live text filter. `GET /admin/activity`.
- **Users** — account table with role badges, active/inactive, failed-attempt + reset-pending flags; Add User modal; activate/deactivate + delete (admin user_id=1 delete disabled). `GET/POST/PATCH/DELETE /admin/users`.
- **Password Control** — reset a user's password (auto strong-password generator), force-reset-on-next-login flag; password policy form (min length, expiry, lockout, history, complexity). `PATCH /admin/users/:id/reset-password`.
- **Backup & Download** — backups table (file, date, type, size, retention); Create Backup Now; per-row Download that builds a JSON manifest Blob and triggers a real browser download (production streams the `.bak`). `GET/POST /admin/backups`.
- **Headline tiles:** DB Used %, Active Sessions, Failed Logins 24h, Last Backup. `GET /mod26/alerts/summary`.
- **Verified:** ADMIN gate passes (role ADMIN), 8 storage tables + 3 capacity bars, 6 users, 5 backups, activity 10/184k with LOGIN_FAIL, maintenance toggle → banner+red card, password reset → 14-char pw, create-user/create-backup → 200, download → blob anchor. No mojibake, home button present.

**PLAN — productionising this mode (backend is currently preview stubs):**
1. **API module `api/admin/`** (mount `/api/v1/admin`, **`requireMinRole('ADMIN')` on every route**; all writes `auditLog(...)`):
   - `GET /storage` — `sys.dm_db_partition_stats` / `sp_spaceused` per table; DB+log size from `sys.database_files`; disk from `xp_fixeddrives` or host metric; file dirs sized on disk.
   - `GET /activity` — paged `SELECT FROM AuditLog ORDER BY ts DESC` with filters (user, action, module, date range); index on `(ts DESC)`.
   - `GET/POST/PATCH/DELETE /users` — wrap MOD-25 logic; create = bcrypt(rounds=12) + `must_reset=1`; delete = soft-delete `is_active=0` (never hard-delete — AS9100D record retention); block self-delete/last-admin-delete.
   - `PATCH /users/:id/reset-password` — set bcrypt hash + `must_reset`, invalidate sessions, audit (never log the plaintext).
   - `GET/PATCH /password-policy` — persist to `SystemConfig`; enforce in login + change-password.
   - `GET/POST /backups`, `GET /backups/:id/download` — `BACKUP DATABASE … TO DISK` to the backup volume; download via signed, time-limited URL streamed with `Content-Disposition`; restore is a separate, double-confirmed, ADMIN+break-glass action (out of scope v1).
   - `PATCH /maintenance` + `GET /maintenance-status` — persist a `maintenance_mode` flag in `SystemConfig`.
2. **Maintenance-mode middleware** — global Express middleware: if `maintenance_mode` ON and `req.user.role !== 'ADMIN'` → `503` + maintenance JSON; frontend interceptor (in `ATCA.api.request`) redirects non-admins to a `/maintenance.html` notice. Login page shows the banner.
3. **Sessions** — `GET /sessions` (active express-session rows) + force-logout a user/all; "Active Sessions" tile becomes live.
4. **Security** — rate-limit + lockout feed the Failed-Logins tile; all admin actions double-audited; consider 2-person rule for destructive ops (delete user, restore backup) under the future AAM.
5. **Scheduling** — nightly `BACKUP` via SQL Agent job; console shows job history + next-run; retention pruning per policy.
6. **DB:** new tables `SystemConfig` (key/value: maintenance_mode, password policy), `BackupCatalog` (filename, path, size, type, status, retention, sha256); reuse `AuditLog`.

### 2026-06-15 — MOD-15 Cross-Module KPI Dashboard (new feature, preview-verified)
**Feature proposed & built:** the planned **MOD-15 KPI Dashboard** (was the home page "Coming Soon" card; AS9100D §9.1 Monitoring, Measurement & Analysis). Single management pane that rolls up every module's live status.
- **Frontend:** `modules/mod15-dashboard/index.html` (Layout C → auto home button). Config-driven aggregation: fetches all per-module `/alerts/summary` endpoints **in parallel** (reuses existing endpoints — no new module backend), classifies each field as critical/warning, and renders:
  - **Compliance Health** ring gauge — `round((green + amber*0.5)/total*100)` with RAG (≥85 green / 60–84 amber / <60 red). Seeded demo data → 14% "Action Needed" (21 critical, 62 warnings across 18 monitored areas — realistic for the seed set).
  - **Headline tiles:** Critical Items, Warnings, Modules Needing Attention.
  - **4 domain roll-ups** (Quality / NDT / Operations / Business & HR) with per-module 🔴/🟡 counts.
  - **Attention Required** — prioritized list (critical first), each row links to its module.
  - **Module Status Matrix** — 18 RAG chips linking to each module.
  - Refresh button + live "Updated HH:MM:SS" + nav `N Critical` badge.
- **Home page:** MOD-15 card + sidebar link flipped from `inactive`/`disabled` → active (border `#1F6BAE`). Only MOD-26 Config now remains inactive (genuinely unbuilt).
- **Bug fixed in passing — MOD-20 page crash (MEDIUM):** `mod20-customer-complaint/index.html` calls `/mod20/alerts/summary` then reads `a.open_complaints` with no null guard, but **no stub existed** → `a` was null → TypeError → KPIs stuck on "—". Added `mod20/alerts/summary` stub (`open_complaints/critical_open/overdue_complaints/open_8d`); MOD-20 KPIs now render `4/1/1/2`. Also added a `mod15/alerts/summary` stub for the dashboard's own nav badge.
- **Verified:** dashboard loads (ATCA object, home button, no mojibake), 4 domain cards, 39 attention items (top = "2 Overdue findings · MOD-08"), 18 matrix chips; home MOD-15 active + HTTP 200; MOD-20 page repaired.

### 2026-06-15 — UX & System Quality Control Protocol (rebuilt + rerun)
**Rebuilt** `TEST-PLAN.md` to v1.1: added **§13 — UX & System QC Protocol** (executable: UX-NAV, UX-LOAD, UX-DATA, UX-LAYOUT, UX-ENC, SYS — 31 checks) and **§14 — Execution Results**.
**Ran** it against the live preview (ThreadingHTTPServer): runtime spot-checks on 8 pages across all 3 layouts + full-app `fetch` sweeps. **Result: 31/31 PASS** after fixing 2 defects found mid-run:
- **DEF-UX-01 (HIGH) — Internal Chat broken:** `mod-chat/index.html` referenced `/assets/js/atca-erp.js`, which **does not exist** (only `atca-core.js` ships). `ATCA` was undefined → `ATCA.initPage()` threw → room list stuck on "Loading…". **Fix:** point chat at `atca-core.js?v=4` (chat only uses `ATCA.api` + `ATCA.initPage`, both in core). Now loads 2 rooms + gets the standard ⌂ home button.
- **DEF-UX-02 (MEDIUM) — App-wide mojibake:** 26/27 pages rendered `â€"`/`Â·`/`Â§` instead of `—`/`·`/`§`. Root cause: HTML/JS source files were **double-encoded** (UTF-8 → misread as cp1252 → re-saved UTF-8) with a UTF-8 BOM. **Fix:** reversed via gap-aware `cp1252` round-trip (handles the 5 undefined C1 bytes 0x81/8D/8F/90/9D as Latin-1) + BOM strip, applied to all 39 frontend files; verified at byte level (`E2 80 94` em-dash restored), 0-mojibake re-sweep across 28 pages, and screenshot. `preview_server.py` STUBS + CSS were already clean.
**Caution for future edits:** do NOT use Windows PowerShell `Set-Content -Encoding utf8` on these files — PS 5.1 writes a BOM and can re-introduce encoding drift. Use the Write/Edit tools or `Out-File -Encoding utf8NoBOM` / Python `open(...,'wb')`.
**Observations (open):** `mod01/alerts/summary` 404 (no UI impact — MOD-01 uses other endpoints); Layout-A pages keep stale per-page sidebars (bridged by home button); `mod06-bath` orphan duplicate.

### 2026-06-15 — Usability Pass: Navigation & Accessibility
**Critical finding — home page navigation was stuck at Phase 1:**
- `index.html` sidebar + module grid still reflected only Phase-1 modules. Audit vs actual folders found: 7 links pointed to non-existent paths (404) — `mod08-audit`, `mod09-customer`, `mod10-vendor`, `mod12-traceability`, `mod13-traveler`, `mod17-mpt`, `mod24-coc`; 9 built modules had NO link (MOD-11/14/16/18/19/20/21/22/23); 7 built modules were greyed `inactive` (MOD-03/06/08/13/17/24/25); 2 phantom links to unbuilt MOD-15/26.
- **Rebuilt** both sidebar and module-card grid: all 27 built modules now linked with correct folder paths, grouped (Quality / NDT / Operations / Business & HR / System). Only MOD-15 KPI Dashboard and MOD-26 Config remain `inactive` (not built). Added User Guide card.
- **Verified:** automated sweep of all 30 hrefs — 28 return 200, 0 broken, 2 correctly inactive.

**Global home button — `ATCA.nav.init()` in atca-core.js:**
- Handles all THREE page layouts (the app has 3 incompatible header structures):
  - **Layout A** (11 modules, `<header id="topbar">`): injects ⌂ after `#sidebar-toggle`
  - **Layout B** (2 modules, `<div id="atca-topbar">`): injects ⌂ into first child div
  - **Layout C** (14 modules, `<nav class="navbar">`): injects ⌂ before `.navbar-brand`
  - mod-chat (loads `atca-erp.js`, not core): has its own explicit ⌂ in sidebar header
- Idempotent (`.atca-home-btn` guard), skips home/login. Verified on all 3 layouts + round-trip click (MOD-03 ⌂ → Home).
- Cache-bust bumped `atca-core.js?v=3` → `?v=4` across all 37 HTML.

**Preview server stability — ThreadingHTTPServer:**
- Root cause of intermittent page-load hangs: `HTTPServer` (single-threaded) deadlocked when any request blocked or a connection went half-open during fast navigation — all subsequent requests (incl. `auth/me`) queued forever, leaving pages stuck `readyState: loading`.
- Switched to `ThreadingHTTPServer` with `daemon_threads = True`. Each request gets its own thread; hangs eliminated, `readyState: complete` reliably.

**Known remaining (separate task):** Layout A pages each carry their OWN hardcoded Phase-1 sidebar (still lists only ~12 modules incl. unbuilt "KPI Dashboard"). The global ⌂ home button bridges this (any page → Home → any module), but those 11 per-page sidebars should eventually be unified with the home page nav. `mod06-bath` is a stale 709-line orphan duplicate of `mod06-bath-control`.

### 2026-06-14 — App Improvement Pass (post Phase 8)
**Critical fix — initPage() crash on 22 modules:**
- `ATCA.session.init()` called `new bootstrap.Modal(document.getElementById('sessionTimeoutModal'))` unconditionally. If element was absent (22/28 modules), Bootstrap threw `Cannot read properties of undefined (reading 'backdrop')`. Added null guard: `const _stEl = document.getElementById('sessionTimeoutModal'); if (_stEl) this.warningModal = ...`
- All 22 previously-crashing modules now load KPI data correctly (verified: MOD-03 IN_PROGRESS=4, PENDING=2, REJECTED=1)

**Preview server hardening:**
- `_serve_static()` method added — serves files with `Cache-Control: no-cache, no-store` headers; directory paths auto-resolve to `index.html`
- Replaced `super().do_GET()` with `_serve_static()` call to prevent browser caching stale JS
- All 37 HTML files cache-busted: `atca-core.js` → `atca-core.js?v=2` (forces fresh fetch of the fixed core)
- New API stubs added: `mod03/jobs` (5 FPI jobs from router data), `mod03/jobs/1` (8-step traveler), `chat/rooms`, `chat/alerts/summary`
- Stub field names corrected to match frontend expectations: `job_ref`, `job_id`, `customer`, `quantity`, `completed_steps`, `total_steps`, `disposition`, `penetrant_type`
- Anodizing chemical bath data seeded from 8 scanned shop routers (ROUTER-12135 through ROUTER-35296): H2SO4 165–210 g/L, Turco 4215-S 30–60 g/L, HNO3 25–35%, DI Water seal 96–100°C, Sanodal Black Dye

**UX improvements:**
- **Global home button** — `ATCA.nav.init()` added to `atca-core.js`; injects a `⌂` house button (`.atca-home-btn`) into `#atca-topbar > div:first-child` on every module page; skips home/login pages. One file change covers all 28 modules automatically. Cache-busted to `atca-core.js?v=3` across all 37 HTML files.
- Chat module: additional `⌂ Home` button in sidebar header (chat has its own nav, no `#atca-topbar`)
- MOD-03 job table: all 5 stub jobs now render with correct ref, part number, quantity, step progress bars
- MOD-06: 9 baths shown (3 FPI + 1 MPT + 5 anodizing from router seed); KPIs live: OUT_OF_SPEC=2, OVERDUE=2, DUE_SOON=4, ACTIVE=9

**Test plan:**
- `TEST-PLAN.md` created — 170+ test cases: Unit (50), Integration (55), AS9100D (10), AC7108 (10), AC7114 FPI (12), AC7114 MPT (8), NAS410 (6), Security/RBAC (18), E2E (10), Alert Contracts (19), Gap Regression (6), Performance (6). 5-week execution plan.

**Router data ingested:**
- 8 PDFs renamed to descriptive names (ROUTER-12135_SulfuricAcidAnodize_TypeII.pdf etc.)
- Process parameters from routers used as realistic preview_server.py seed data across MOD-06, MOD-14, MOD-24 stubs

### 2026-06-14 — Phase 8 Extended: Signature Upload, Internal Chat, User Manual v1.8
**New features delivered:**
- **Signature Upload** — Migration `027_user_signature.sql` adds `signature_data NVARCHAR(MAX)` + `signature_updated_at` to Users. Auth endpoints: `PATCH /auth/signature` (self), `PATCH /auth/signature/admin/:userId` (ADMIN), `GET /auth/signature/:userId`. MOD-25 user table gets pen icon per user — opens Signature modal with current preview + file upload.
- **Internal Chat (WhatsApp-style)** — Migration `026_chat.sql`: ChatRoom, ChatParticipant (UNIQUE), ChatMessage. Backend `api/chat/index.js`: rooms, messages, users; 3s polling via `?since=ISO` timestamp. Frontend `modules/mod-chat/index.html`: sidebar + main thread layout; DIRECT and GROUP rooms; soft-delete; New DM/Group modal with user list.
- **User Manual v1.8** — `user-guide.html` expanded from 7 modules to full 26-module + 4-feature coverage. Added sections for MOD-01, 08–24, Signature Upload, Internal Chat, Change Log, Bug Report. Sidebar TOC rebuilt.
- **index.html** — Added module cards for Change Log, Bug Report, and Internal Chat in System section.
- **/simplify applied** — 5 backend gap-closure files cleaned: combined dual-reduce into single-pass accumulator (journal.routes.js), OUTPUT clause replaces separate SELECT for sequence generation (journal + purchase-orders), DATEADD moved to SQL eliminating JS Date arithmetic (calibrations.routes.js).

### 2026-06-14 — Compliance Gap Closure (post System Test)
**6 gaps identified in System Test v1.0 closed:**
- **GAP-01 JE balance** — `finance/journal.routes.js` `POST /journal-entries`: validates `totalDebit === totalCredit` (±0.005); also added `entry_date`/`description` required check and minimum 2-line guard
- **GAP-02 PO/AVL gate** — `purchasing/purchase-orders.routes.js` `POST /purchase-orders`: queries `Supplier.status` before INSERT; returns 422 if not APPROVED
- **GAP-03 CoC re-issue** — `certificate-of-conformance/coc.routes.js` `PATCH /:id/issue`: explicit pre-check on status; 404 if not found, 400 if VOID ("cannot re-issue — create new CoC"), 400 if already ISSUED
- **GAP-04 FPI sequential** — `fpi-process/fpi-inspection.routes.js` signoff endpoint: checks `step_seq - 1` signed_off = 1 before allowing current step; 400 if out-of-sequence
- **GAP-05 OOT withdrawal** — `equipment-calibration/calibrations.routes.js` `POST /`: when `out_of_tolerance = true`, UPDATE Equipment.status = 'WITHDRAWN' + separate auditLog; response includes `withdrawn: true` and warning message
- **GAP-06 NAS410 PT cert** — `fpi-process/fpi-inspection.routes.js` signoff: queries `NdtCertification` for active PT cert linked to `req.user.userId` via Personnel; 403 if none found
**Still open (next Phase 8 session):** MPT MT cert check, MOD-15/25/26, Electronic Signature, AAM Register, Multi-entity, ECN, Frozen Process Items, Alert Escalation

### 2026-06-14 — System Test v1.0 (full suite, preview-verified)
**Scope:** All built modules — Phases 1–8 (MOD-01–24, changelog, bugreport)
**Results:**
- **Alert summary contracts (19/19 PASS):** All modules return required field shapes. Fixed: MOD-03 had no stub (added); MOD-06 had wrong field names (fixed to out_of_spec/overdue_sample/due_soon/total_baths)
- **Write endpoints (39/39 PASS):** All POST and PATCH endpoints return 200 after adding do_PATCH/do_PUT/do_DELETE handlers to preview_server.py (previously returned 501)
- **Data list endpoints (20/20 PASS):** All module list and detail endpoints return 200 with correct shape
- **Frontend page renders (8 pages screenshot-verified):** Changelog ✅ Bug Report ✅ Finance (incl. Chart of Accounts) ✅ Payroll ✅ Maintenance ✅ Inventory ✅ Communications ✅ HR ✅
- **Compliance data-* attribute check:** 0 violations across all tested pages (MOD-11/14/16/21/22/23/24, changelog, bugreport)
- **initPage() coverage (25/25 PASS):** All module pages confirmed to have `await ATCA.initPage()`
**Bugs fixed during test:**
1. `mod07-ncr-capa/index.html` — missing `await ATCA.initPage()` (SoR §1 session guard) → FIXED
2. `mod01-qms-core/index.html` — missing `await ATCA.initPage()` → FIXED
3. `preview_server.py` — no `do_PATCH/do_PUT/do_DELETE` handler → FIXED (all return 200)
4. `preview_server.py` — MOD-03 had no `/alerts/summary` stub → FIXED
5. `preview_server.py` — MOD-06 `/alerts/summary` had wrong field names → FIXED

### 2026-06-14 — Phase 8 Partial: Change Log + Bug Report (preview-verified)
**Built:**
- **Change Log** — `api/changelog/index.js`; `modules/mod-changelog/index.html`; migration `025_changelog.sql` (seeded 11 entries v1.0.0–1.7.0); category filter (FEATURE/BUGFIX/MIGRATION/CONFIG/SECURITY); version badge in dark monospace; POST requires ENGINEER+; auditLog on every write
- **Bug Report** — `api/bugreport/index.js`; `modules/mod-bugreport/index.html`; migration `026_bugreport.sql`; table sorted by severity priority then date; CRITICAL/HIGH/MEDIUM/LOW badges; OPEN/IN_PROGRESS/RESOLVED/WONT_FIX status; Report Bug (any auth), resolve (SUPERVISOR+); "1 Critical" nav badge in preview
- **server.js** — mounted `/changelog` and `/bugreport`
- **preview_server.py** — stubs for both modules with realistic data (8 changelog entries, 4 bugs incl. CRITICAL/HIGH/MEDIUM/LOW mix)
- **System test results:** Changelog: KPIs 11/4/8/3 ✅ · 8 rows ✅. Bug Report: KPIs 3/1/5/1.8 ✅ · 4 rows ✅ · severity badges correct ✅ · RESOLVED row shows checkmark ✅

### 2026-06-13 — Phases 5, 6 & 7 Complete (MOD-11, MOD-12, MOD-14, MOD-16, MOD-18, MOD-21, MOD-22, MOD-23)
**Built in same session — all backend + frontend + preview stubs:**
- **MOD-11 Maintenance** — 3-tab (Asset Register, PM Schedule, Work Permits); assets.routes/schedules.routes/permits.routes; MA-/WP- auto-number via Mod11Sequence; RAG on PM schedule (DUE_SOON/OVERDUE/OK); `completeSchedule()`, `activatePermit()`, `closePermit()`
- **MOD-12 Purchasing** — 3-tab (Supplier/AVL, PRs, POs); SUP-/PR-/PO- auto-number via Mod12Sequence; accreditation expiry highlighted in red; `suspendSupplier()` (QA_MANAGER), `approvePr()`, `issuePo()` (also updates PR → PO_RAISED)
- **MOD-14 Inventory** — 2-tab (Register, Movements); INV- auto-number; RAG kanban summary cards (RED/AMBER/GREEN); `quickReceipt()` via prompt; movements update `current_stock` atomically
- **MOD-18 HR Management** — 2-tab (Staff Register, Org Structure); EMP-NNNN auto-number (no year); `markOnboarding()`, COI declaration tracking; org chart as Bootstrap cards
- **MOD-21 Communications** — card-based announcement board; URGENT/IMPORTANT/NORMAL priority colour badges; per-card Acknowledge button; IF NOT EXISTS insert pattern for AnnouncementAck
- **MOD-22 Leave & Attendance** — 2-tab (Leave Requests, Leave Types); leave types loaded into select dropdown; `approveLeave(id, status)` PATCH; KPIs: pending/on-leave/absent/low-balance
- **MOD-23 Payroll** — Run list (DRAFT/APPROVED/DISBURSED); Run Detail modal shows PayrollLines with CPF columns; `approveRun()` (QA_MANAGER), `disburseRun()` (ADMIN, confirms before action)
- **MOD-16 Finance** — 4-tab (AR Invoices, AP Invoices, Journal Entries, Chart of Accounts); Chart of Accounts: 13 seeded accounts; AR/JE share Mod16Sequence (INV-/JE- prefixes); `postJe()` requires confirm; `markArPaid()`, `approveAp()`
- **preview_server.py** — added stubs for all 8 modules (alerts/summary + list + detail) with realistic Singapore-context data
- **Migrations 017–024** — all written; MOD-21 AnnouncementAck has UNIQUE(announcement_id, user_id); MOD-22 AttendanceRecord has UNIQUE(staff_id, date); MOD-16 shares sequence for AR+JE

### 2026-06-13 — Phase 2 Complete (MOD-08, MOD-13, MOD-17, MOD-24)
**Built and preview-verified:**
- **MOD-08 Audit Management** — `audit-management/` backend; AuditPlan (AP-YYYY-NNNN), AuditFinding (AF-YYYY-NNNN), AuditResponse; audit-plans.routes.js + findings.routes.js; 2-tab frontend with PLANNED/NADCAP/INTERNAL badges, finding raise/respond/verify workflow; KPIs: 2/5/2/3 ✅
- **MOD-13 Work Order** — `work-order/` backend; WorkOrder (WO-YYYY-NNNN), WoStep, WoDocument, WoNote; auto step bulk-insert on WO creation; job traveler modal with step sign-off; priority HIGH/NORMAL/URGENT badges; progress bar (done_steps/total_steps); KPIs: 4/1/2/1 ✅
- **MOD-17 MPT Process** — `mpt-process/` backend; MptJob (MPT-YYYY-NNNN), MptInspectionStep (6 steps auto-inserted per AC7114), MptResult; dynamic SET clause for step field updates (prevents SQL injection); WET_FLUORESCENT/WET_VISIBLE/DRY technique badges; step progress; KPIs: 3/1/1/0 ✅
- **MOD-24 Certificate of Conformance** — `certificate-of-conformance/` backend; CertificateOfConformance (COC-YYYY-NNNN), CocLineItem; DRAFT→ISSUED (QA_MANAGER only)→VOID workflow; issue endpoint atomically updates linked WO.coc_issued=1; FPI/MPT/Chem Bath process flag badges; print modal; KPIs: 2/15/1/0 ✅
- **server.js** — mounted `/api/v1/mod08`, `/api/v1/mod13`, `/api/v1/mod17`, `/api/v1/mod24`
- **preview_server.py** — added GET stubs for all 4 modules (alerts/summary + list + detail endpoints)
- **Fix discovered:** preview runs `preview_server.py` (Python), NOT `preview-server.js` (Node). All stub data must go in the Python STUBS dict.
- **Fix:** Phase 2 HTML files initially had wrong asset paths (`/assets/bootstrap.min.css`) — corrected to `/assets/css/` and `/assets/js/`

---

## Bug Fix Log (2026-06-12)
| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `mod04/index.js` | `certs_expired`/`eye_expired` field names didn't match what `index.html` read (`expired_certs`/`expired_eye_exams`) — KPI cards always showed "—" | Renamed response fields to match dashboard |
| 2 | `mod01/reviews.routes.js` | `PUT /actions/:actionId` defined after `PUT /:id` — Express matched `/actions/5` as id='actions', making action updates permanently unreachable | Moved action update route before generic `/:id` route |
| 3 | `atca-core.js` + all module pages | Auto-init DOMContentLoaded caused duplicate clock timers, double alert polling, and doubled session event listeners on every page | Replaced auto-init with singleton `ATCA.initPage()` promise; all pages converted to call it |
| 4 | `mod05/calibrations.routes.js` | PUT update handler missing `updated_at = GETUTCDATE()` | Added timestamp update |
| 5 | `atca-core.js` | No `delete()` method on `ATCA.api` | Added `ATCA.api.delete()` |
| 6 | `mod01/policy.routes.js` | INSERT set `approved_by = @userId` on a DRAFT policy | Removed `approved_by` from INSERT; only set by the approve endpoint |

### Auto-calculations
- **Eye exam expiry:** NAS410 §9.3 — expiry_date = exam_date + 12 months. Server-side (personnel.routes.js) + client-side preview (mod04 JS).
- **Calibration due date:** cal_due_date = cal_date + cal_interval_months. Server-side (calibrations.routes.js) + client-side preview.
- **Bath sample overdue:** sampled_at + sample_frequency_days < TODAY → overdue flag (to be implemented in MOD-06).

---

## File Structure (abbreviated)
```
ATCA-ERP/
├── src/
│   ├── backend/
│   │   ├── server.js                          ← Main entry, mounts all API routes
│   │   ├── config/database.js                 ← SQL Server pool singleton
│   │   ├── middleware/auth.js                 ← requireAuth, requireMinRole, auditLog, getLanIp
│   │   └── api/
│   │       ├── qms-core/
│   │       │   ├── quality-policy.routes.js
│   │       │   ├── objectives.routes.js
│   │       │   ├── management-reviews.routes.js
│   │       │   ├── risk-register.routes.js
│   │       │   └── index.js
│   │       ├── document-control/
│   │       │   ├── controlled-documents.routes.js
│   │       │   ├── retention-schedule.routes.js
│   │       │   └── index.js
│   │       ├── fpi-process/
│   │       │   ├── fpi-inspection.routes.js
│   │       │   └── index.js
│   │       ├── ndt-personnel/
│   │       │   ├── ndt-personnel.routes.js
│   │       │   ├── ndt-certifications.routes.js
│   │       │   └── index.js
│   │       ├── equipment-calibration/
│   │       │   ├── equipment.routes.js
│   │       │   ├── calibrations.routes.js
│   │       │   └── index.js
│   │       ├── chemical-bath-control/
│   │       │   ├── chemical-baths.routes.js
│   │       │   └── index.js
│   │       ├── ncr-capa/
│   │       │   ├── non-conformance.routes.js
│   │       │   ├── corrective-actions.routes.js
│   │       │   └── index.js
│   │       ├── audit-management/
│   │       │   ├── audit-plans.routes.js
│   │       │   ├── findings.routes.js
│   │       │   └── index.js
│   │       ├── work-order/
│   │       │   ├── work-orders.routes.js
│   │       │   └── index.js
│   │       ├── mpt-process/
│   │       │   ├── mpt-jobs.routes.js
│   │       │   ├── mpt-results.routes.js
│   │       │   └── index.js
│   │       └── certificate-of-conformance/
│   │           ├── coc.routes.js
│   │           └── index.js
│   └── frontend/
│       ├── assets/
│       │   ├── css/ (bootstrap.min.css, atca-erp.css)
│       │   ├── js/ (bootstrap.bundle.min.js, atca-core.js)
│       │   └── fonts/ (bootstrap-icons.css + fonts)
│       ├── shared/layout.html                 ← Template with {{SLOT_*}} placeholders
│       ├── user-guide.html                    ← Full user manual (all modules, compliance refs)
│       └── modules/
│           ├── mod01-qms-core/
│           │   ├── index.html
│           │   ├── quality-policy.html
│           │   ├── objectives.html
│           │   ├── management-review.html
│           │   └── risk-register.html
│           ├── mod02-document-control/
│           │   ├── index.html
│           │   ├── document-master-list.html
│           │   ├── revision-workflow.html
│           │   └── retention-schedule.html
│           ├── mod03-fpi-process/index.html
│           ├── mod04-ndt-personnel/index.html
│           ├── mod05-equipment-calibration/index.html
│           ├── mod06-bath-control/index.html
│           ├── mod07-ncr-capa/index.html
│           ├── mod08-audit-management/index.html
│           ├── mod09-sales-customer-service/index.html
│           ├── mod10-production-management/index.html
│           ├── mod13-work-order/index.html
│           ├── mod17-mpt-process/index.html
│           ├── mod19-extended-laboratory/index.html
│           ├── mod20-customer-complaint/index.html
│           ├── mod24-certificate-of-conformance/index.html
│           ├── mod25-user-management/index.html
│           ├── mod11-maintenance/index.html
│           ├── mod12-purchasing/index.html
│           ├── mod14-inventory/index.html
│           ├── mod16-finance/index.html
│           ├── mod18-hr-management/index.html
│           ├── mod21-communications/index.html
│           ├── mod22-leave-attendance/index.html
│           ├── mod23-payroll/index.html
│           ├── mod-changelog/index.html
│           └── mod-bugreport/index.html
└── database/
    └── migrations/                            ← Sequential numbers — do not rename
        ├── 001_core_framework.sql
        ├── 002_mod01_qms_core.sql
        ├── 003_mod02_document_control.sql
        ├── 004_mod07_ncr_capa.sql
        ├── 005_mod04_personnel.sql
        ├── 006_mod05_equipment.sql
        ├── 007_mod06_bath_control.sql
        ├── 008_mod03_fpi_process.sql
        ├── 013_mod08_audit_management.sql
        ├── 014_mod13_work_order.sql
        ├── 015_mod17_mpt_process.sql
        ├── 016_mod24_certificate_of_conformance.sql
        ├── 017_mod11_maintenance.sql
        ├── 018_mod12_purchasing.sql
        ├── 019_mod14_inventory.sql
        ├── 020_mod18_hr_management.sql
        ├── 021_mod21_communications.sql
        ├── 022_mod22_leave_attendance.sql
        ├── 023_mod23_payroll.sql
        ├── 024_mod16_finance.sql
        ├── 025_changelog.sql
        └── 026_bugreport.sql
```
