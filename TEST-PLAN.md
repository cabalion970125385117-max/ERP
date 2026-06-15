# ATCA-ERP System Test Plan
**Version:** 1.2  
**Date:** 2026-06-15  
**Prepared by:** QA / Development  
**Standards:** AS9100D · NADCAP AC7108 · NADCAP AC7110 · NADCAP AC7114 · NAS410  

> **v1.2 change (2026-06-15):** MOD-25 User Management backend complete (§3.14, §5.2 RBAC, §7 alert contract added). MOD-25/26 closed as built in §12 — all 26 SoR modules now complete. §13 UX-NAV criteria updated to 29 pages (28 module pages + home). §14 run footnote added.  
> **v1.1 change:** Added **Section 13 — UX & System Quality Control Protocol**, an executable protocol run against the live preview (`http://localhost:3000`). Covers navigation accessibility, page-load integrity, data rendering, layout/header consistency, text-encoding QC, and server stability. Latest execution results in **Section 14**.

---

## 1. Strategy Overview

### 1.1 Testing Pyramid

```
              ┌──────────────┐
              │   E2E / UAT  │  ← 15 critical workflows, browser-driven
              ├──────────────┤
              │ Integration  │  ← All 39 write endpoints + RBAC boundaries
              ├──────────────┤
              │  Unit Tests  │  ← Business logic, calculations, validators
              └──────────────┘
```

### 1.2 Tooling

| Layer | Tool | Config |
|---|---|---|
| Unit (backend) | **Jest** + `@types/jest` | `jest.config.js`, `testEnvironment: node` |
| Integration (API) | **Supertest** + Jest | Separate `tests/integration/` suite |
| E2E | **Playwright** | `playwright.config.ts`, target `http://localhost:3000` |
| SQL mocking | **jest-mock-extended** on `mssql` pool | Inject mock pool via DI |
| Coverage | **jest --coverage** | Target: >80% lines on route files |

### 1.3 Coverage Targets

| Area | Target | Rationale |
|---|---|---|
| Auth & RBAC | 100% | Security boundary |
| FPI process routes | 100% | NADCAP AC7114 critical |
| MPT process routes | 100% | NADCAP AC7114 critical |
| Chemical bath routes | 100% | NADCAP AC7108 critical |
| NDT personnel / NAS410 | 100% | Certification compliance |
| NCR & CAPA | 95% | AS9100D §8.7 |
| CoC issue workflow | 100% | AS9100D §8.6 conformity release |
| All other modules | 80% | General quality |

### 1.4 Test Data

Use seeded test data already loaded in `preview_server.py` stubs and router data cards:
- **Router-12681** — Black Anodize, Front Plate/Hub Frame
- **Router-24913** — Sulfuric Acid Anodize, Inner Body Housing
- **Router-35296** — Sulfuric Acid Anodize, Parker Klient Lever
- Personnel: ATCA-001 to ATCA-006 (seed via `001_init.sql`)
- Equipment: 20 items (UV lamps, thermometers, pressure gauges)

---

## 2. Unit Tests — Backend Business Logic

### 2.1 Authentication & Session (`server.js`)

| ID | Test Case | Compliance |
|---|---|---|
| U-AUTH-01 | `bcrypt.compare` returns true for correct password, false otherwise | — |
| U-AUTH-02 | Session contains `userId`, `username`, `role`, `lanIp` after login | — |
| U-AUTH-03 | `requireAuth` rejects requests with no session (401) | — |
| U-AUTH-04 | `requireMinRole` allows user AT or ABOVE minimum role | — |
| U-AUTH-05 | `requireMinRole` rejects user BELOW minimum role (403) | — |
| U-AUTH-06 | RBAC ladder is ordered: READONLY < NDT_INSPECTOR < SUPERVISOR < ENGINEER < QA_MANAGER < ADMIN | — |
| U-AUTH-07 | Signature data URI validation rejects non-`data:image/` prefix | — |
| U-AUTH-08 | Signature byte-length check rejects payloads >700 KB | — |
| U-AUTH-09 | `lanIp` correctly reads `X-Forwarded-For` then `socket.remoteAddress` | — |

### 2.2 Sequence Number Generation

| ID | Test Case | Compliance |
|---|---|---|
| U-SEQ-01 | FPI job number format: `FPI-YYYY-NNNN` (zero-padded 4 digits) | AC7114 traceability |
| U-SEQ-02 | MPT job number format: `MPT-YYYY-NNNN` | AC7114 traceability |
| U-SEQ-03 | WO number format: `WO-YYYY-NNNN` | AS9100D §8.5 |
| U-SEQ-04 | CoC number format: `COC-YYYY-NNNN` | AS9100D §8.6 |
| U-SEQ-05 | PO number format: `PO-YYYY-NNNN` | MOD-12 |
| U-SEQ-06 | JE number format: `JE-YYYY-NNNN` | MOD-16 |
| U-SEQ-07 | Year rollover: sequence resets to 0001 when calendar year changes | — |
| U-SEQ-08 | OUTPUT clause in UPDATE returns `last_num` atomically (no race window) | — |

### 2.3 FPI Process Logic (`fpi-inspection.routes.js`)

| ID | Test Case | Compliance |
|---|---|---|
| U-FPI-01 | Step sign-off advances step `status` to `COMPLETE` | AC7114 §4 |
| U-FPI-02 | Step sign-off records `inspector_id`, `inspector_name`, `signed_at` timestamp | AC7114 §4.7 |
| U-FPI-03 | Out-of-tolerance (OOT) flag withdrawal: sets `oot_status = 'WITHDRAWN'`, blocks re-inspection | AC7114 §4 gap |
| U-FPI-04 | `disposition` must be `ACCEPT` or `REJECT` — other values return 400 | AC7114 |
| U-FPI-05 | Sequential step enforcement: cannot sign off step N+1 before step N is COMPLETE | AC7114 §4 gap |
| U-FPI-06 | Rejected job cannot be re-accepted without new job creation | AC7114 |

### 2.4 MPT Process Logic (`mpt-jobs.routes.js`)

| ID | Test Case | Compliance |
|---|---|---|
| U-MPT-01 | All 6 AC7114 steps auto-inserted on job creation | AC7114 §5 |
| U-MPT-02 | UV lamp intensity ≥1000 µW/cm² required at step 2 — below value returns 422 | AC7114 §5.4 |
| U-MPT-03 | Ambient light ≤2 fc required at step 2 — above value returns 422 | AC7114 §5.4 |
| U-MPT-04 | Step field map validation — only allowed field names can be set per step | Security |
| U-MPT-05 | Job status transitions: RECEIVED → IN_PROGRESS → ACCEPTED/REJECTED | AC7114 |
| U-MPT-06 | Result `REJECT` requires `rejection_reason` non-null | AC7114 |

### 2.5 Chemical Bath Control (`chemical-baths.routes.js`)

| ID | Test Case | Compliance |
|---|---|---|
| U-BATH-01 | Bath log `result = 'FAIL'` if temp_c or concentration outside min/max | AC7108 §3 |
| U-BATH-02 | `OUT_OF_SPEC` status set on bath when log result = FAIL | AC7108 §3 |
| U-BATH-03 | `ncr_required` flag triggers NCR-linked field requirement | AS9100D §8.7 |
| U-BATH-04 | `next_test_due` calculated correctly from `test_frequency_days` | AC7108 |
| U-BATH-05 | Anodize bath: H2SO4 concentration 165–210 g/L, temp 18–22°C per MIL-A-8625 Type II | AC7108 |

### 2.6 Equipment Calibration (`calibrations.routes.js`)

| ID | Test Case | Compliance |
|---|---|---|
| U-CAL-01 | `cal_due_date` = `DATEADD(MONTH, cal_interval_months, cal_date)` — computed in SQL | AS9100D §7.1.5 |
| U-CAL-02 | Default interval 12 months when `cal_interval_months` is NULL | — |
| U-CAL-03 | `cal_rag_status` = `OVERDUE` when `cal_due_date < TODAY` | AS9100D §7.1.5 |
| U-CAL-04 | `cal_rag_status` = `DUE_SOON` when due within 30 days | — |
| U-CAL-05 | `out_of_tolerance = true` on calibration record triggers equipment `status = QUARANTINE` | AS9100D §7.1.5 |

### 2.7 NDT Personnel / NAS410 (`ndt-personnel.routes.js`, `ndt-certifications.routes.js`)

| ID | Test Case | Compliance |
|---|---|---|
| U-PERS-01 | Certification `status = 'EXPIRED'` when `expiry_date < TODAY` | NAS410 §5 |
| U-PERS-02 | Eye exam `status = 'EXPIRED'` when `exam_expiry < TODAY` | NAS410 §6 |
| U-PERS-03 | `days_left` is negative for expired certifications | — |
| U-PERS-04 | Cannot assign inspector with EXPIRED cert to FPI/MPT job (422) | NAS410 §5 |
| U-PERS-05 | `cert_scheme` must be one of `NAS410`, `EN4179`, `ASNT` | NAS410 |
| U-PERS-06 | `ndt_level` must be `I`, `II`, or `III` | NAS410 §4 |

### 2.8 Finance — Journal Balance (`journal.routes.js`)

| ID | Test Case | Compliance |
|---|---|---|
| U-FIN-01 | Journal entry rejected when `SUM(debit) ≠ SUM(credit)` (400) | AS9100D §8.1 |
| U-FIN-02 | Single-pass reduce correctly sums debit and credit totals | — |
| U-FIN-03 | Journal lines with 0 amount are rejected | — |

### 2.9 CoC Issue Workflow (`coc.routes.js`)

| ID | Test Case | Compliance |
|---|---|---|
| U-COC-01 | DRAFT → ISSUED requires `QA_MANAGER` or above | AS9100D §8.6 |
| U-COC-02 | ISSUED CoC sets `coc_issued = 1` on linked `WorkOrder` atomically | AS9100D §8.6 |
| U-COC-03 | VOID requires reason text (non-null) | AS9100D §8.6 |
| U-COC-04 | Re-issue creates new CoC record; original is VOIDED | AS9100D gap closure |
| U-COC-05 | Line items must reference a valid FPI, MPT, or process result | AS9100D §8.6 |

### 2.10 Purchasing — AVL Gate (`purchase-orders.routes.js`)

| ID | Test Case | Compliance |
|---|---|---|
| U-PO-01 | PO cannot be issued if supplier `status ≠ 'APPROVED'` (422) | AS9100D §8.4 gap |
| U-PO-02 | PO number auto-generated via OUTPUT clause (no race condition) | — |
| U-PO-03 | PO line total cannot be negative | — |

---

## 3. Integration Tests — API Endpoints

Run against a test SQL Server instance (or in-memory mock). Use Supertest.

### 3.1 Auth Endpoints

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-AUTH-01 | `POST /api/v1/auth/login` | Valid credentials | 200, session cookie set |
| I-AUTH-02 | `POST /api/v1/auth/login` | Wrong password | 401, `{message}` |
| I-AUTH-03 | `POST /api/v1/auth/login` | Inactive user | 403 |
| I-AUTH-04 | `GET /api/v1/auth/me` | Valid session | 200, user object |
| I-AUTH-05 | `GET /api/v1/auth/me` | No session | 401 |
| I-AUTH-06 | `POST /api/v1/auth/logout` | Valid session | 200, session destroyed |
| I-AUTH-07 | `PATCH /api/v1/auth/signature` | Data URI, <700 KB | 200 |
| I-AUTH-08 | `PATCH /api/v1/auth/signature` | Data URI, >700 KB | 413 |
| I-AUTH-09 | `PATCH /api/v1/auth/signature/admin/:userId` | ADMIN role | 200 |
| I-AUTH-10 | `PATCH /api/v1/auth/signature/admin/:userId` | QA_MANAGER role | 403 |

### 3.2 MOD-03 FPI Process

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-FPI-01 | `GET /api/v1/mod03/jobs` | Authenticated | 200, `{items, total}` |
| I-FPI-02 | `POST /api/v1/mod03/jobs` | SUPERVISOR+ with valid payload | 201, `job_number = FPI-YYYY-NNNN` |
| I-FPI-03 | `POST /api/v1/mod03/jobs` | NDT_INSPECTOR role | 403 |
| I-FPI-04 | `POST /api/v1/mod03/jobs/:id/steps/:seq/signoff` | Valid, step in sequence | 200 |
| I-FPI-05 | `POST /api/v1/mod03/jobs/:id/steps/:seq/signoff` | Step out of sequence | 422 |
| I-FPI-06 | `POST /api/v1/mod03/jobs/:id/result` | `disposition=ACCEPT` | 200, `status=ACCEPTED` |
| I-FPI-07 | `POST /api/v1/mod03/jobs/:id/result` | `disposition=REJECT` | 200, `status=REJECTED` |
| I-FPI-08 | `GET /api/v1/mod03/alerts/summary` | Authenticated | 200, `{in_progress, pending_signoff, rejected, total}` |

### 3.3 MOD-04 NDT Personnel / NAS410

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-PERS-01 | `GET /api/v1/mod04/personnel` | Authenticated | 200, array with `exam_days_left` |
| I-PERS-02 | `POST /api/v1/mod04/certifications` | Valid cert, ENGINEER+ | 201 |
| I-PERS-03 | `POST /api/v1/mod04/certifications` | Expired cert (expiry in past) | 422 or cert created with EXPIRED status |
| I-PERS-04 | `GET /api/v1/mod04/alerts/summary` | Authenticated | 200, all four fields present |
| I-PERS-05 | `DELETE /api/v1/mod04/personnel/:id` | QA_MANAGER+ | 200, soft-deleted |
| I-PERS-06 | `DELETE /api/v1/mod04/personnel/:id` | SUPERVISOR role | 403 |

### 3.4 MOD-05 Equipment Calibration

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-CAL-01 | `GET /api/v1/mod05/equipment` | Authenticated | 200, RAG status in each item |
| I-CAL-02 | `POST /api/v1/mod05/calibrations` | `out_of_tolerance=true` | 200, equipment `status=QUARANTINE` |
| I-CAL-03 | `POST /api/v1/mod05/calibrations` | `out_of_tolerance=false` | 200, `cal_due_date` set correctly |
| I-CAL-04 | `GET /api/v1/mod05/alerts/summary` | Authenticated | 200, `{cal_overdue, cal_due_30d, never_calibrated, total}` |

### 3.5 MOD-06 Chemical Bath Control

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-BATH-01 | `GET /api/v1/mod06/baths` | Authenticated | 200, all baths with RAG status |
| I-BATH-02 | `POST /api/v1/mod06/logs` | In-spec reading | 200, bath `status=IN_SPEC` |
| I-BATH-03 | `POST /api/v1/mod06/logs` | Out-of-spec reading | 200, bath `status=OUT_OF_SPEC` |
| I-BATH-04 | `POST /api/v1/mod06/logs` | Missing required fields | 400 |
| I-BATH-05 | `GET /api/v1/mod06/alerts/summary` | Authenticated | 200, `{out_of_spec, overdue_sample, due_soon}` |

### 3.6 MOD-07 NCR & CAPA

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-NCR-01 | `POST /api/v1/mod07/ncr` | Valid NCR, SUPERVISOR+ | 201, `ncr_ref=NCR-YYYY-NNN` |
| I-NCR-02 | `PATCH /api/v1/mod07/ncr/:id/disposition` | Set disposition | 200 |
| I-NCR-03 | `POST /api/v1/mod07/capa` | Valid CAPA linked to NCR | 201 |
| I-NCR-04 | `PATCH /api/v1/mod07/capa/:id/verify` | QA_MANAGER+ | 200, status=CLOSED |
| I-NCR-05 | `PATCH /api/v1/mod07/capa/:id/verify` | SUPERVISOR role | 403 |

### 3.7 MOD-08 Audit Management

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-AUD-01 | `POST /api/v1/mod08/audit-plans` | Valid plan, QA_MANAGER+ | 201, `audit_number=AP-YYYY-NNNN` |
| I-AUD-02 | `POST /api/v1/mod08/findings` | Finding linked to valid plan | 201 |
| I-AUD-03 | `PATCH /api/v1/mod08/findings/:id/respond` | Submit response | 200, status=RESPONSE_SUBMITTED |
| I-AUD-04 | `PATCH /api/v1/mod08/findings/:id/verify` | QA_MANAGER+ only | 200, status=VERIFIED |

### 3.8 MOD-13 Work Order / Job Traveler

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-WO-01 | `POST /api/v1/mod13/work-orders` | Valid WO | 201, `wo_number=WO-YYYY-NNNN` |
| I-WO-02 | `POST /api/v1/mod13/work-orders/:id/steps/:seq/complete` | SUPERVISOR+ | 200 |
| I-WO-03 | `GET /api/v1/mod13/work-orders/:id` | Includes steps[] array | 200 |
| I-WO-04 | `PATCH /api/v1/mod13/work-orders/:id/status` | Invalid status value | 400 |

### 3.9 MOD-17 MPT Process

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-MPT-01 | `POST /api/v1/mod17/jobs` | Valid job | 201, 6 steps auto-created |
| I-MPT-02 | `PATCH /api/v1/mod17/jobs/:id/steps/2` | UV intensity <1000 | 422 |
| I-MPT-03 | `PATCH /api/v1/mod17/jobs/:id/steps/2` | UV intensity ≥1000, ambient ≤2 fc | 200 |
| I-MPT-04 | `PATCH /api/v1/mod17/jobs/:id/steps/2` | Ambient light >2 fc | 422 |
| I-MPT-05 | `POST /api/v1/mod17/jobs/:id/result` | `result=REJECT`, no reason | 400 |
| I-MPT-06 | `GET /api/v1/mod17/alerts/summary` | Authenticated | 200 |

### 3.10 MOD-24 Certificate of Conformance

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-COC-01 | `POST /api/v1/mod24/cocs` | Valid draft | 201, `status=DRAFT` |
| I-COC-02 | `POST /api/v1/mod24/cocs/:id/issue` | QA_MANAGER+ | 200, `status=ISSUED`, WO `coc_issued=1` |
| I-COC-03 | `POST /api/v1/mod24/cocs/:id/issue` | ENGINEER role | 403 |
| I-COC-04 | `POST /api/v1/mod24/cocs/:id/void` | With reason | 200, `status=VOID` |
| I-COC-05 | `POST /api/v1/mod24/cocs/:id/void` | Without reason | 400 |
| I-COC-06 | `POST /api/v1/mod24/cocs/:id/reissue` | From ISSUED | 201 new COC, original VOIDED |

### 3.11 MOD-12 Purchasing — AVL Gate

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-PO-01 | `POST /api/v1/mod12/purchase-orders` | Supplier status=APPROVED | 201, `po_number=PO-YYYY-NNNN` |
| I-PO-02 | `POST /api/v1/mod12/purchase-orders` | Supplier status=PENDING | 422, AVL gate message |
| I-PO-03 | `POST /api/v1/mod12/purchase-orders` | Supplier status=SUSPENDED | 422 |

### 3.12 MOD-16 Finance

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-FIN-01 | `POST /api/v1/mod16/journal-entries` | Balanced (debit=credit) | 201 |
| I-FIN-02 | `POST /api/v1/mod16/journal-entries` | Unbalanced | 400, balance error message |
| I-FIN-03 | `PATCH /api/v1/mod16/ar-invoices/:id/mark-paid` | QA_MANAGER+ | 200 |
| I-FIN-04 | `PATCH /api/v1/mod16/ap-invoices/:id/approve` | QA_MANAGER+ | 200 |

### 3.13 Chat (`/api/v1/chat`)

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-CHAT-01 | `GET /api/v1/chat/rooms` | Authenticated | 200, only rooms user belongs to |
| I-CHAT-02 | `POST /api/v1/chat/rooms` | DM: same two users again | 200, returns existing room (de-dup) |
| I-CHAT-03 | `GET /api/v1/chat/rooms/:id/messages?since=ISO` | Participant | 200, only messages after `since` |
| I-CHAT-04 | `GET /api/v1/chat/rooms/:id/messages` | Non-participant | 403 |
| I-CHAT-05 | `DELETE /api/v1/chat/rooms/:id/messages/:mid` | Own message | 200, `is_deleted=1` |
| I-CHAT-06 | `DELETE /api/v1/chat/rooms/:id/messages/:mid` | Other user's message | 403 |

### 3.14 MOD-25 User Management

| ID | Method + Path | Scenario | Expected |
|---|---|---|---|
| I-USR-01 | `GET /api/v1/mod25/alerts/summary` | QA_MANAGER+ | 200, `{total_users, active_users, inactive_users, elevated_roles}` all numeric |
| I-USR-02 | `GET /api/v1/mod25/alerts/summary` | ENGINEER role | 403 |
| I-USR-03 | `GET /api/v1/mod25/users` | QA_MANAGER+ | 200, `{items: [...], total}` |
| I-USR-04 | `GET /api/v1/mod25/users` | NDT_INSPECTOR role | 403 |
| I-USR-05 | `POST /api/v1/mod25/users` | ADMIN, valid payload, pw ≥12 chars | 201, `{user_id, username}` |
| I-USR-06 | `POST /api/v1/mod25/users` | ADMIN, duplicate username | 409 |
| I-USR-07 | `POST /api/v1/mod25/users` | ADMIN, pw <12 chars | 400 |
| I-USR-08 | `POST /api/v1/mod25/users` | QA_MANAGER role | 403 |
| I-USR-09 | `PUT /api/v1/mod25/users/:id` | ADMIN, change role | 200 |
| I-USR-10 | `PUT /api/v1/mod25/users/:id` | ADMIN deactivates own account | 400 (self-deactivation blocked) |
| I-USR-11 | `PUT /api/v1/mod25/users/:id` | QA_MANAGER role | 403 |
| I-USR-12 | `POST /api/v1/mod25/users/:id/reset-password` | ADMIN, pw ≥12 chars | 200, `failed_attempts` reset to 0 |
| I-USR-13 | `POST /api/v1/mod25/users/:id/reset-password` | ADMIN, pw <12 chars | 400 |
| I-USR-14 | `POST /api/v1/mod25/users/:id/reset-password` | QA_MANAGER role | 403 |
| I-USR-15 | `POST /api/v1/mod25/users/:id/reset-password` | Inactive user id | 404 |

---

## 4. Compliance-Critical Test Cases

### 4.1 AS9100D

| ID | Clause | Test Case | Module |
|---|---|---|---|
| C-AS-01 | §7.5 — Document Control | Documents must have revision, status, effective date before approval | MOD-02 |
| C-AS-02 | §7.5.3 — Document Changes | Revision history updated on every document edit | MOD-02 |
| C-AS-03 | §7.1.5 — Calibration | Equipment out-of-tolerance triggers quarantine + NCR link | MOD-05 |
| C-AS-04 | §8.4 — External Providers | PO blocked if supplier not on AVL (status=APPROVED) | MOD-12 |
| C-AS-05 | §8.5 — Production Control | WO step sign-off recorded with name + timestamp | MOD-13 |
| C-AS-06 | §8.6 — Release of Product | CoC required before product release; ISSUED by QA_MANAGER+ | MOD-24 |
| C-AS-07 | §8.7 — NCR | Nonconforming product disposition recorded; CAPA traceable to NCR | MOD-07 |
| C-AS-08 | §9.2 — Internal Audit | Audit findings linked to audit plan; verified by QA | MOD-08 |
| C-AS-09 | §9.3 — Management Review | MR records input/output fields; status PLANNED→CLOSED | MOD-01 |
| C-AS-10 | §10.2 — Corrective Action | CAPA closed only after effectiveness verification | MOD-07 |

### 4.2 NADCAP AC7108 — Chemical Processing

| ID | Para | Test Case | Module |
|---|---|---|---|
| C-AC08-01 | §3.2 | Bath concentration in spec before process start; job blocked if OUT_OF_SPEC | MOD-06, MOD-13 |
| C-AC08-02 | §3.3 | Temperature logged for each bath sample record | MOD-06 |
| C-AC08-03 | §3.4 | Frequency: bath tested per defined `test_frequency_days`; overdue alert fires | MOD-06 |
| C-AC08-04 | §4 | Chemical product identity (name, lot number) recorded on bath | MOD-06 |
| C-AC08-05 | §5 | Anodize bath: H2SO4 165–210 g/L, 18–22°C; rejection outside these bounds | MOD-06 |
| C-AC08-06 | §5 | Alkaline degreaser: concentration 30–60 g/L, temp 60–75°C | MOD-06 |
| C-AC08-07 | §5 | Acid etch: HNO3 25–35%, temp 15–30°C | MOD-06 |
| C-AC08-08 | §5 | Seal tank: temp 96–100°C DI water, conductivity <20 µS/cm | MOD-06 |
| C-AC08-09 | §6 | Test piece / coupon result recorded with each bath check | MOD-10 |
| C-AC08-10 | §7 | Out-of-spec bath generates NCR and puts associated WO on hold | MOD-06 + MOD-07 |

### 4.3 NADCAP AC7114 — FPI (Penetrant Inspection)

| ID | Para | Test Case | Module |
|---|---|---|---|
| C-AC14F-01 | §4.2 | Pre-clean step must be completed before penetrant application | MOD-03 |
| C-AC14F-02 | §4.3 | Penetrant dwell time recorded; minimum dwell enforced | MOD-03 |
| C-AC14F-03 | §4.4 | Emulsifier contact time within spec limits | MOD-03 |
| C-AC14F-04 | §4.5 | Wash stage: water pressure and temperature recorded | MOD-03 |
| C-AC14F-05 | §4.6 | Developer application method and dwell time recorded | MOD-03 |
| C-AC14F-06 | §4.7 | Inspector NAS410 Level II certification verified before step sign-off | MOD-03 + MOD-04 |
| C-AC14F-07 | §4.8 | Disposition: ACCEPT or REJECT only; rejection requires description | MOD-03 |
| C-AC14F-08 | §4 | OOT indication: withdrawal recorded, job cannot proceed without QA approval | MOD-03 |
| C-AC14F-09 | §5 | UV lamp intensity ≥1000 µW/cm² recorded at inspection step | MOD-03 |
| C-AC14F-10 | §5 | Ambient white light ≤2 fc recorded at inspection step | MOD-03 |
| C-AC14F-11 | §6 | Process parameters traceable to job via `fpi_job_id` on all step records | MOD-03 |
| C-AC14F-12 | §8 | TAM (Temperature Anomaly Monitor) panel result recorded | MOD-03 |

### 4.4 NADCAP AC7114 — MPT (Magnetic Particle)

| ID | Para | Test Case | Module |
|---|---|---|---|
| C-AC14M-01 | §5.2 | Pre-clean (Step 1) must be marked COMPLETE before magnetisation | MOD-17 |
| C-AC14M-02 | §5.4 | UV lamp ≥1000 µW/cm² and ambient ≤2 fc enforced at Step 2 | MOD-17 |
| C-AC14M-03 | §5.5 | Magnetisation method (CIRCULAR/LONGITUDINAL/MULTIDIRECTIONAL) recorded | MOD-17 |
| C-AC14M-04 | §5.6 | Particle concentration (0.1–0.4 mL/100 mL) within spec from bath log | MOD-17 + MOD-06 |
| C-AC14M-05 | §5.7 | Examination result with indication count/location recorded | MOD-17 |
| C-AC14M-06 | §5.8 | Demagnetisation performed and gauss residual recorded at Step 6 | MOD-17 |
| C-AC14M-07 | §6 | Inspector NAS410 Level II verified before result sign-off | MOD-17 + MOD-04 |
| C-AC14M-08 | §7 | Wet fluorescent bath concentration and temperature match recent bath log | MOD-17 + MOD-06 |

### 4.5 NAS410 — NDT Personnel Certification

| ID | Para | Test Case | Module |
|---|---|---|---|
| C-NAS-01 | §5 | Active cert required per method (PT/MT); EXPIRED cert blocks assignment | MOD-04 |
| C-NAS-02 | §5.4 | Cert expiry alert at 90 days | MOD-04 |
| C-NAS-03 | §6 | Eye exam within 12 months; expired exam blocks assignment | MOD-04 |
| C-NAS-04 | §6 | Eye exam expiry alert at 60 days | MOD-04 |
| C-NAS-05 | §4 | Level I cannot independently sign off inspection results | MOD-04 |
| C-NAS-06 | §7 | Cert scheme must be NAS410, EN4179, or ASNT | MOD-04 |

---

## 5. Security & RBAC Tests

### 5.1 Authentication Bypass

| ID | Test Case | Expected |
|---|---|---|
| S-01 | Direct API call to any `/api/v1/*` without session cookie | 401 |
| S-02 | Replayed expired session cookie | 401 |
| S-03 | Login with SQL-injection username: `' OR 1=1 --` | 401 (parameterized query, no injection) |
| S-04 | Login with XSS username: `<script>alert(1)</script>` | 401 (no reflection) |

### 5.2 RBAC Escalation Checks

For each protected endpoint, test with the role ONE LEVEL below the minimum required:

| ID | Endpoint | Min Role | Test With | Expected |
|---|---|---|---|---|
| S-RBAC-01 | `POST /api/v1/mod03/jobs` | SUPERVISOR | NDT_INSPECTOR | 403 |
| S-RBAC-02 | `POST /api/v1/mod24/cocs/:id/issue` | QA_MANAGER | ENGINEER | 403 |
| S-RBAC-03 | `DELETE /api/v1/mod04/personnel/:id` | QA_MANAGER | SUPERVISOR | 403 |
| S-RBAC-04 | `PATCH /api/v1/auth/signature/admin/:userId` | ADMIN | QA_MANAGER | 403 |
| S-RBAC-05 | `POST /api/v1/mod16/journal-entries` | ENGINEER | SUPERVISOR | 403 |
| S-RBAC-06 | `PATCH /api/v1/mod07/capa/:id/verify` | QA_MANAGER | SUPERVISOR | 403 |
| S-RBAC-07 | `DELETE /api/v1/mod02/documents/:id` | QA_MANAGER | ENGINEER | 403 |
| S-RBAC-08 | `POST /api/v1/mod23/runs/:id/disburse` | ADMIN | QA_MANAGER | 403 |
| S-RBAC-09 | `POST /api/v1/mod25/users` | ADMIN | QA_MANAGER | 403 |
| S-RBAC-10 | `GET /api/v1/mod25/users` | QA_MANAGER | ENGINEER | 403 |
| S-RBAC-11 | `PUT /api/v1/mod25/users/:id` | ADMIN | QA_MANAGER | 403 |
| S-RBAC-12 | `POST /api/v1/mod25/users/:id/reset-password` | ADMIN | QA_MANAGER | 403 |

### 5.3 Injection Prevention

| ID | Test Case | Expected |
|---|---|---|
| S-INJ-01 | `GET /api/v1/mod03/jobs?process_area=FPI'; DROP TABLE FpiJobs--` | 200 or 400 (parameterized — no execution) |
| S-INJ-02 | `POST /api/v1/mod07/ncr` with `description` containing `<script>` | Stored as literal text; returned escaped in JSON |
| S-INJ-03 | `PATCH /api/v1/mod17/jobs/:id/steps/2` with unknown field name | 400 (field map whitelist enforced) |

### 5.4 Soft-Delete Leakage

| ID | Test Case | Expected |
|---|---|---|
| S-SD-01 | Soft-deleted equipment `is_active=0` not in `GET /equipment` list | Not returned |
| S-SD-02 | Soft-deleted personnel not assignable to new jobs | 422 on assignment |
| S-SD-03 | Soft-deleted supplier not selectable for new PO | 422 on PO creation |

---

## 6. End-to-End Workflow Tests (Playwright)

### E2E-01: Complete FPI Job Lifecycle (AC7114 §4 Critical Path)

```
Login as SUPERVISOR
→ MOD-13: Create Work Order (customer, part number, quantity)
→ MOD-03: Create FPI Job linked to WO
→ MOD-03: Sign off Step 1 (Pre-clean) as NDT_INSPECTOR
→ MOD-03: Sign off Step 2 (Penetrant apply + dwell) — record temp, time
→ MOD-03: Sign off Step 3 (Emulsifier / wash)
→ MOD-03: Sign off Step 4 (Developer + dwell)
→ MOD-03: Sign off Step 5 (UV lamp reading ≥1000 µW/cm², ambient ≤2 fc)
→ MOD-03: Sign off Step 6 (Examination) — ACCEPT disposition
→ MOD-03: Sign off Step 7 (Post-clean)
→ MOD-03: Sign off Step 8 (Final QA sign-off) as QA_MANAGER
→ MOD-24: Create CoC → Issue
→ Verify WO shows coc_issued = true
```
**Pass criteria:** All steps COMPLETE, CoC status ISSUED, job status ACCEPTED.

---

### E2E-02: Chemical Bath Out-of-Spec → NCR → CAPA → Resolution (AC7108 §3)

```
Login as SUPERVISOR
→ MOD-06: Record bath sample for ANO-SA-001
   — Enter concentration outside 165–210 g/L range
→ Verify bath status = OUT_OF_SPEC
→ MOD-07: Raise NCR linked to bath
→ MOD-07: Add CAPA (root cause, corrective action)
→ MOD-06: Record new bath sample — within spec
→ Verify bath status = IN_SPEC
→ MOD-07: Verify CAPA as QA_MANAGER → status = CLOSED
```
**Pass criteria:** NCR linked to CAPA, bath returns to IN_SPEC, CAPA CLOSED with verification.

---

### E2E-03: Equipment Calibration OOT → Quarantine → Recall (AS9100D §7.1.5)

```
Login as ENGINEER
→ MOD-05: Record calibration for UV-001 with out_of_tolerance = true
→ Verify equipment status = QUARANTINE
→ MOD-07: Verify NCR auto-raised for OOT equipment (if implemented)
→ MOD-03: Attempt to create FPI job — UV-001 quarantined
→ Verify job creation blocked or warning shown
→ MOD-05: Record follow-up calibration — in tolerance
→ Verify equipment returns to ACTIVE
```
**Pass criteria:** QUARANTINE blocks process use; re-calibration restores ACTIVE.

---

### E2E-04: NDT Inspector Certification Expiry → Assignment Block (NAS410)

```
Login as QA_MANAGER
→ MOD-04: Edit ATCA-002 FPI cert — set expiry to yesterday
→ Verify cert status = EXPIRED
→ Verify MOD-04 alert badge increments
→ MOD-03: Attempt to sign off inspection step as ATCA-002
→ Verify sign-off blocked with NAS410 expiry message
→ MOD-04: Add new certification with future expiry
→ Verify ATCA-002 can now sign off inspection
```
**Pass criteria:** Expired cert blocks step sign-off; renewed cert unblocks.

---

### E2E-05: Purchasing AVL Gate (AS9100D §8.4)

```
Login as ENGINEER
→ MOD-12: Create supplier — status = PENDING
→ MOD-12: Create PR linked to PENDING supplier
→ MOD-12: Attempt to issue PO against PENDING supplier
→ Verify PO blocked with AVL gate message
→ MOD-12: Approve supplier → status = APPROVED
→ MOD-12: Issue PO → success
```
**Pass criteria:** PO blocked for non-APPROVED supplier; issued after approval.

---

### E2E-06: CoC Re-Issue Workflow (AS9100D §8.6 Gap Closure)

```
Login as QA_MANAGER
→ MOD-24: Create CoC → Issue (status = ISSUED)
→ MOD-24: Re-issue CoC → new COC number created
→ Verify original CoC status = VOID
→ Verify new CoC references original via re_issue_of field
```
**Pass criteria:** Original voided; new CoC issued with traceability link.

---

### E2E-07: MPT Full Job Lifecycle (AC7114 §5)

```
Login as SUPERVISOR
→ MOD-17: Create MPT job (technique, part, inspector)
→ Verify 6 AC7114 steps auto-inserted
→ Complete Step 1 (Pre-clean)
→ Complete Step 2 — UV ≥1000, ambient ≤2 fc
→ Attempt Step 2 with UV = 800 → verify blocked
→ Complete Steps 3–6
→ Record result: ACCEPT, no indications
→ Verify job status = ACCEPTED
```
**Pass criteria:** UV intensity gate enforced; all 6 steps completeable in sequence.

---

### E2E-08: Internal Chat — New DM + Message Poll

```
Login as User A
→ MOD-CHAT: Open new DM with User B
→ Send 3 messages
→ Open second browser tab as User B
→ Wait 3 seconds (poll interval)
→ Verify messages appear without page refresh
→ Delete own message → verify soft-deleted (hidden)
→ Attempt to delete User A's message as User B → verify blocked
```
**Pass criteria:** 3s incremental polling delivers messages; soft-delete scoped to own messages.

---

### E2E-09: Signature Upload Per User

```
Login as ADMIN
→ MOD-25: Open user record for ATCA-002
→ Click pen icon → Signature modal opens
→ Upload a PNG image <700 KB
→ Save → success
→ Logout; login as ATCA-002
→ MOD-25: Open own user → signature preview shows uploaded image
→ Attempt upload of >700 KB file → verify client-side size error
```
**Pass criteria:** Admin can upload for others; user sees own signature; size limit enforced.

---

### E2E-10: Journal Entry Balance Enforcement (AS9100D §8.1)

```
Login as ENGINEER
→ MOD-16: Create new journal entry
→ Add debit line: 1000.00
→ Add credit line: 800.00
→ Attempt to save → verify balance error (debit ≠ credit)
→ Correct credit to 1000.00
→ Save → success, JE-YYYY-NNNN generated
```
**Pass criteria:** Unbalanced entry rejected; balanced entry creates JE number.

---

## 7. Alert Summary Contract Tests

Every module exposes `GET /api/v1/modXX/alerts/summary`. Test that each returns **exactly** the fields the dashboard consumes:

| Module | Required Fields |
|---|---|
| MOD-03 | `in_progress`, `pending_signoff`, `rejected`, `total` |
| MOD-04 | `expired_certs`, `certs_expiring_90d`, `expired_eye_exams`, `eye_expiring_60d`, `total` |
| MOD-05 | `cal_overdue`, `cal_due_30d`, `never_calibrated`, `total` |
| MOD-06 | `out_of_spec`, `overdue_sample`, `due_soon`, `total_baths`, `total` |
| MOD-07 | `open_ncr`, `overdue_capa`, `pending_verify`, `ncr_open_only`, `total` |
| MOD-08 | `planned_audits`, `open_findings`, `overdue_findings`, `pending_verification` |
| MOD-11 | `due_this_week`, `overdue_pm`, `open_permits`, `active_breakdowns` |
| MOD-12 | `approved_suppliers`, `pending_pr`, `open_po`, `expiring_accreditations` |
| MOD-13 | `active_jobs`, `overdue_jobs`, `pending_qa`, `coc_pending` |
| MOD-14 | `low_stock`, `out_of_stock`, `expiring_chemicals`, `total_items` |
| MOD-16 | `ar_outstanding`, `overdue_invoices`, `ap_outstanding`, `pending_payroll_runs` |
| MOD-17 | `active_jobs`, `pending_review`, `overdue`, `rejected_this_month` |
| MOD-18 | `total_staff`, `new_this_month`, `pending_onboarding`, `conflict_declarations_due` |
| MOD-21 | `active_announcements`, `unacknowledged`, `urgent_count`, `expired_this_week` |
| MOD-22 | `pending_requests`, `on_leave_today`, `absent_today`, `low_balance_staff` |
| MOD-23 | `pending_runs`, `current_month_gross`, `staff_paid`, `runs_disbursed_ytd` |
| MOD-24 | `draft_cocs`, `issued_cocs`, `pending_coc`, `voided_cocs` |
| CHANGELOG | `total_entries`, `entries_this_month`, `feature_count`, `bugfix_count` |
| MOD-25 | `total_users`, `active_users`, `inactive_users`, `elevated_roles` |
| BUGREPORT | `open_bugs`, `critical_bugs`, `resolved_this_month`, `avg_resolution_days` |

**Test pattern:** Call endpoint, assert 200, assert all fields present and numeric (not undefined/null).

---

## 8. Regression Tests — Gap Closures

These test the 6 compliance gaps fixed in Phase 8:

| ID | Gap | Test |
|---|---|---|
| R-01 | JE Balance | Unbalanced JE returns 400; balanced creates entry |
| R-02 | PO AVL Gate | PO against PENDING/SUSPENDED supplier blocked with 422 |
| R-03 | CoC Re-Issue | Re-issue creates new COC; original voided atomically |
| R-04 | FPI Sequential Steps | Step N+1 sign-off blocked until step N = COMPLETE |
| R-05 | OOT Withdrawal | OOT result sets `oot_status=WITHDRAWN`; job placed on hold |
| R-06 | NAS410 PT Cert | Inspector with PT cert assigned to MPT job → 422 (method mismatch) |

---

## 9. Performance Smoke Tests

Run after go-live on LAN server (192.168.1.10):

| ID | Test | Acceptable |
|---|---|---|
| P-01 | Login response time | <500 ms |
| P-02 | `GET /api/v1/mod03/jobs` (100 records) | <800 ms |
| P-03 | `GET /api/v1/alerts/summary` (aggregates all modules) | <1.5 s |
| P-04 | FPI job traveler page load (all steps) | <1 s |
| P-05 | Chat poll `GET /rooms/:id/messages?since=ISO` (3 s interval) | <200 ms |
| P-06 | CoC PDF print modal render | <1 s |

---

## 10. Test Execution Plan

### Phase A — Unit Tests (Week 1)
- Set up Jest + mssql mock
- Write U-AUTH-*, U-SEQ-*, U-FPI-*, U-MPT-*, U-BATH-*, U-CAL-*, U-PERS-*, U-FIN-*, U-COC-*, U-PO-*
- Target: all unit tests green in CI

### Phase B — Integration Tests (Week 2)
- Set up test SQL Server database with seed data
- Write Supertest suites for all 39 write endpoints
- Include RBAC negative tests (S-RBAC-01 to S-RBAC-08)
- Target: 100% of compliance-critical endpoints covered

### Phase C — Compliance Tests (Week 3)
- Execute C-AS-*, C-AC08-*, C-AC14F-*, C-AC14M-*, C-NAS-* test cases
- Document evidence (screenshots, API responses) for NADCAP audit trail
- Raise defect tickets for any failures → MOD-BUGREPORT

### Phase D — E2E Tests (Week 4)
- Set up Playwright against preview server (then against staging DB)
- Implement E2E-01 to E2E-10 as Playwright scripts
- Run on Chrome (primary) + Edge (secondary)
- Record video artefacts for NADCAP evidence package

### Phase E — Regression + Sign-off (Week 5)
- Execute all R-01 to R-06 gap closure regression tests
- Execute alert contract tests (Section 7)
- Performance smoke tests on LAN server
- QA sign-off by QA_MANAGER

---

## 11. Defect Classification

| Severity | Criteria | SLA to Fix |
|---|---|---|
| **CRITICAL** | Compliance gate bypassed (RBAC, AVL, CoC issue, cert check) | Same day |
| **HIGH** | Data integrity failure (balance, OOT, sequential steps) | 24 hours |
| **MEDIUM** | Feature incorrect but workaround exists | 3 days |
| **LOW** | UI/UX defect, cosmetic | Next sprint |

All defects logged via `POST /api/v1/bugreport/bugs` (MOD-BUGREPORT).

---

## 12. Coverage Gaps — Not In Scope (Phase 1)

The following are acknowledged gaps for future phases:

| Item | Reason |
|---|---|
| ~~MOD-15 KPI Dashboard~~ | ✅ **Built 2026-06-15** — `modules/mod15-dashboard/`; composes all `/modXX/alerts/summary` into a compliance-health roll-up (AS9100D §9.1). Now active on home page. |
| ~~MOD-25 User Management backend~~ | ✅ **Built 2026-06-15** — `api/mod25/index.js`; GET /users (QA_MANAGER+), POST /users, PUT /users/:id, POST /users/:id/reset-password (ADMIN only); audit-logged; self-deactivation guard. |
| ~~MOD-26 System Maintenance Console~~ | ✅ **Built 2026-06-15** — `modules/mod26-maintenance/`; ADMIN-gated superuser console; storage/activity-logs/users/password-control/backup + maintenance-mode toggle. **All 26 SoR modules are now complete.** |
| Electronic Signature (non-repudiation) | AAM phase |
| AAM (Acceptance Authority Matrix) | Phase 9 |
| ECN (Engineering Change Notice) | Phase 9 |
| Frozen Process control | Phase 9 |
| Multi-entity data isolation | Phase 9 |
| Load / stress testing (>10 concurrent users) | Phase 9 |
| Penetration testing | External engagement |

---

## 13. UX & System Quality Control Protocol (Executable)

**Purpose:** Verify the application is usable and accessible as a real user would meet it — every page reachable, every page loads cleanly, data renders, and the system stays responsive. Run against the live preview server (`preview_server.py`, `http://localhost:3000`) using browser-driven checks.

**Scope:** All 27 built module pages + home + login. **Method:** browser navigation + DOM assertions + network inspection. **Pre-req:** preview server running; logged-in session (preview auto-auths as `admin`).

### 13.1 Navigation & Accessibility (UX-NAV)

| ID | Test Case | Method | Pass Criteria |
|---|---|---|---|
| UX-NAV-01 | Home page links to every built module | Enumerate `a.module-card` + `a.nav-link` hrefs; fetch each | All built-module links return HTTP 200 |
| UX-NAV-02 | No broken (404) navigation links | Fetch every home href | 0 links return 404 |
| UX-NAV-03 | No built module is greyed `inactive` | Check `.inactive`/`.disabled` class on each card | 0 inactive cards (all 26 SoR modules + Phase 8 pages built) |
| UX-NAV-04 | Every module page has a Home button | Load each page; query `.atca-home-btn` | `.atca-home-btn` present on all 28 module pages |
| UX-NAV-05 | Home button returns to dashboard | Click `.atca-home-btn` on a module | Lands on `/`, title = "Home — ATCA-ERP" |
| UX-NAV-06 | Home button is unique (not duplicated) | Count `.atca-home-btn` per page | Exactly 1 per page (idempotent injection) |
| UX-NAV-07 | Home/login pages do NOT show a home button | Load `/` and `/login` | `.atca-home-btn` absent |
| UX-NAV-08 | Sidebar/nav lists all built modules grouped | Inspect home `#sidebar` | All 28 built module pages present, grouped by domain |

### 13.2 Page-Load Integrity (UX-LOAD)

| ID | Test Case | Method | Pass Criteria |
|---|---|---|---|
| UX-LOAD-01 | Every module page returns HTTP 200 | Fetch each module index | 200 for all 27 |
| UX-LOAD-02 | Page reaches `readyState = complete` | Navigate + poll | No page hangs in `loading` (≤5 s) |
| UX-LOAD-03 | `ATCA` core object initialises | Eval `typeof ATCA` (bare) | `"object"` — no `initPage()` crash |
| UX-LOAD-04 | Core JS loaded with current cache version | Inspect `<script>` src | `atca-core.js?v=4` (or current) present |
| UX-LOAD-05 | No uncaught console errors on load | Read console logs after load | 0 error-level messages |
| UX-LOAD-06 | All page assets resolve | Network panel after load | 0 failed (4xx/5xx) asset requests |

### 13.3 Data Rendering (UX-DATA)

| ID | Test Case | Method | Pass Criteria |
|---|---|---|---|
| UX-DATA-01 | KPI cards populate from API | Read `.kpi-value` text after load | No KPI stuck on `—` or `Loading…` when API returns data |
| UX-DATA-02 | Data tables render rows | Count `tbody tr` on list pages | ≥1 row (or explicit "No records" empty state) |
| UX-DATA-03 | No literal `undefined`/`null`/`NaN` in cells | Scan rendered table text | 0 occurrences of literal `undefined` |
| UX-DATA-04 | Alert summary contract per module | GET each `/modXX/alerts/summary` | 200 + required fields numeric (see §7) |
| UX-DATA-05 | Empty state is graceful | Filter to an empty result | Shows "No records found.", not blank/spinner |

### 13.4 Layout & Header Consistency (UX-LAYOUT)

| ID | Test Case | Method | Pass Criteria |
|---|---|---|---|
| UX-LAYOUT-01 | Each page has a recognised header | Detect `#topbar` / `#atca-topbar` / `nav.navbar` | Exactly one header type present |
| UX-LAYOUT-02 | Home button placed consistently | Check parent of `.atca-home-btn` | In header region, left-aligned, before title/brand |
| UX-LAYOUT-03 | Module title/badge shown in header | Inspect header text | Module name/MOD-ID visible |
| UX-LAYOUT-04 | User chip / identity present | Query user element | User name or chip rendered |

### 13.5 Text-Encoding QC (UX-ENC)

| ID | Test Case | Method | Pass Criteria |
|---|---|---|---|
| UX-ENC-01 | No mojibake in served HTML | Scan page text for `â€"`, `Â·`, `â€™`, `â€œ` | 0 mojibake sequences rendered |
| UX-ENC-02 | Charset declared UTF-8 | Check `<meta charset>` + response header | `UTF-8` declared and served |
| UX-ENC-03 | Special chars render correctly | Inspect em-dash/middot in titles | `—` and `·` render, not `â€"`/`Â·` |

### 13.6 System Stability & Caching (SYS)

| ID | Test Case | Method | Pass Criteria |
|---|---|---|---|
| SYS-01 | Server survives rapid sequential navigation | Navigate 10 pages quickly | No `ERR_CONNECTION_REFUSED`; server stays up |
| SYS-02 | Concurrent requests handled (threaded) | Fire parallel fetches | All resolve; no deadlock/hang |
| SYS-03 | Static assets sent no-cache | Inspect response headers | `Cache-Control: no-cache, no-store` on JS/CSS |
| SYS-04 | API write verbs supported | OPTIONS/probe PATCH/PUT/DELETE handlers | Not 501 (handlers present) |
| SYS-05 | Unknown route returns clean 404 | GET a bogus path | 404 JSON, server stays responsive |

**Defect severity for this protocol:** UX-NAV/UX-LOAD failures (page unreachable or crashes) = **HIGH**; UX-DATA/UX-ENC (renders but wrong) = **MEDIUM**; cosmetic = **LOW**. Log via MOD-BUGREPORT.

---

## 14. UX & System QC — Execution Results

### Run 2026-06-15 — Build: post-navigation-rebuild

> **Note (v1.2):** This run was executed before MOD-15 (KPI Dashboard), MOD-26 (Maintenance Console), and MOD-25 backend were built. References to "27 module pages", "unbuilt MOD-15/26 inactive", and "session = admin/QA_MANAGER" reflect that point in time. Current build state: 28 module pages (26 SoR + Change Log + Bug Report + Chat), 0 inactive cards, preview admin role = ADMIN. A fresh protocol run should be conducted against the complete build.

**Environment:** `preview_server.py` (ThreadingHTTPServer) @ `http://localhost:3000`, session = admin/QA_MANAGER. **Method:** browser navigation + DOM assertions + `fetch` sweeps + network/console inspection. **Coverage:** 27 module pages + home + login; runtime spot-checks on 8 pages spanning all 3 layouts (MOD-01/03/04/13/14/16/21 + chat).

| Group | Result | Notes |
|---|---|---|
| **UX-NAV** Navigation & Accessibility | **8/8 PASS** | 28/28 active home links → 200, 0 broken; only unbuilt MOD-15/26 inactive; home button on all 27 pages; round-trip click verified (MOD-01 & MOD-03 → Home); 1 button/page; home & login correctly have none |
| **UX-LOAD** Page-Load Integrity | **6/6 PASS** | 27/27 → HTTP 200; all reach `readyState=complete` (no hangs after threading fix); `ATCA` initialises (object) on all; `atca-core.js?v=4` loaded; 0 console errors; 0 failed assets (after chat fix) |
| **UX-DATA** Data Rendering | **5/5 PASS** | KPIs populate (e.g. MOD-03 `4/2/1/0`, MOD-16 `125,600/2/38,450/1`); tables render rows (MOD-13=8, MOD-14=10); MOD-21 card-based (3 cards); 0 literal `undefined`; empty state = "No records found." |
| **UX-LAYOUT** Layout & Header Consistency | **4/4 PASS** | Every page exactly one header (A:10 / B:2 / C:15); home button left-aligned in header on all 3 layouts; module title/badge shown; user identity present |
| **UX-ENC** Text-Encoding QC | **3/3 PASS** *(was 1/3 — fixed this run)* | 0 mojibake across 28 pages (was 26/27); UTF-8 declared + served; `—`/`·`/`§`/`°` render correctly |
| **SYS** System Stability & Caching | **5/5 PASS** | Survives rapid navigation (no `ERR_CONNECTION_REFUSED`); 12 concurrent requests resolved in 631 ms (threaded, no deadlock); `Cache-Control: no-cache, no-store, must-revalidate`; PATCH → 200 (not 501); bogus page & API → 404 |

**Overall: 31/31 PASS** after fixing 2 defects found mid-run.

#### Defects found this run

| ID | Severity | Finding | Status |
|---|---|---|---|
| DEF-UX-01 | **HIGH** | **Internal Chat broken** — `mod-chat/index.html` loaded `/assets/js/atca-erp.js`, a file that does not exist (only `atca-core.js` ships). `ATCA` was undefined → `ATCA.initPage()` threw → room list stuck on "Loading…". | **FIXED** — switched to `atca-core.js?v=4`. Verified: `ATCA`=object, 2 rooms load, home button injected. |
| DEF-UX-02 | **MEDIUM** | **App-wide text mojibake** — 26/27 pages rendered `â€"` (for `—`), `Â·` (for `·`), `Â§` (for `§`) etc. Root cause: HTML/JS source files were double-encoded (valid UTF-8 → misread as cp1252 → re-saved as UTF-8), with a UTF-8 BOM prepended. | **FIXED** — reversed the double-encoding (`cp1252` round-trip, gap-aware for the 5 undefined C1 bytes) and stripped BOM across all 39 frontend files. Verified at byte level (`E2 80 94` restored) and via 0-mojibake re-sweep + screenshot. |

#### Observations (no fix required this run)

- `GET /api/v1/mod01/alerts/summary` → 404. MOD-01 (QMS Core) sources its KPIs from other endpoints; KPIs render correctly (`APPROVED/2/1/OVERDUE`). No UI impact — stub intentionally absent.
- **Layout A pages** (10) still carry their own hardcoded Phase-1 sidebars (list ~12 modules incl. unbuilt "KPI Dashboard"). Bridged by the global home button; unify in a later pass.
- `mod06-bath` is a stale 709-line orphan duplicate of `mod06-bath-control` (not linked from home; candidate for deletion).

#### Evidence
- MOD-03 header now renders `NADCAP AC7114 · ASTM E1417 · AMS 2644 · NAS410` and Result column `—` (previously `Â·` / `â€"`).
- Chat: 2 conversations load ("Sarah Lim Mei Ling", "QA Team") with home button in sidebar + navbar.

