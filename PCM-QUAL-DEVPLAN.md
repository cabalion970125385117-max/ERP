# PCM, FPI/Electroplating Split & Customer Qualification — Development Plan
**ATCA-ERP v1.0 | ATC Aviation Pte Ltd**
**Authored:** 2026-06-17 | **Status:** ✅ BUILT 2026-06-17 (all 3 parts, preview-verified)
**Source reference:** `ATC-PCM-001 REV A.xlsx` (Process Capability Matrix, Rev A, 07/01/2026, Originator: JF Teh)

> **Build note (2026-06-17):** All three parts implemented and preview-verified.
> - **Part A** — migration 029 (`ChemBath.process_category` + extended electroplating types + Bay/dims); MOD-06 backend split (`?category`, nested `fpi`/`plating` summary); frontend two tabs (FPI Process Tanks / Electroplating) + per-tab KPIs + envelope column. Verified: FPI=4 tanks (1/0/1/4), Electroplating=8 baths (1/1/2/8).
> - **Part B** — migration 030 (PcmProcess/PcmCapability/PcmRevision/Mod28Sequence); `tools/import_pcm.py` parses `ATC-PCM-001` → **101 capabilities / 22 processes / 31 customers**; backend `api/mod28`; frontend `mod28-pcm` (Capability Matrix + Processes + Revisions). Demo data generated from the real workbook.
> - **Part C** — migration 032 (CustomerQualification/QualGap/QualActivity/QualPeriodicAudit); backend `api/mod29` (5-stage state machine + guards: no-advance-with-open-gaps, no-award-without-PASS, QA_MANAGER award); frontend `mod29-qualification` (register + 5-stage tracker detail). Verified: 3 demo qualifications across stages.
> Mounted `/mod28` + `/mod29` in server.js; home cards + sidebar entries added; preview loads `tools/pcm_demo.json` + `tools/mod29_demo.json`; both merged into `atca-demo.js`. **NOT yet committed/pushed/deployed.**

---

## 0. Overview

Three related deliverables, driven by the customer-supplied **Process Capability Matrix (PCM)**:

| Part | Deliverable | Type |
|---|---|---|
| **A** | Split **FPI tank records** (NDT) from **chemical-processing/electroplating** baths in MOD-06 | Refactor |
| **B** | **MOD-28 — Process Capability Master (PCM)**: the process × customer × specification capability register, seeded from `ATC-PCM-001` | New module |
| **C** | **MOD-29 — Customer Qualification**: the qualification lifecycle workflow — Gap Analysis → Close Gap → Qualification → Closing & Award → Periodic Audit | New module |

**Why these belong together:** the PCM defines *what ATC is capable of and for which customer/spec*; the Qualification module manages *how a customer formally qualifies ATC to perform a capability*, and the MOD-06 split reflects the PCM's own structure — **NDT (FPI, ASTM E1417) is a separate area from Chemical Processing (electroplating, NADCAP AC7108/AC7110)**.

**What the PCM contains (from the workbook):**
- 23 process sheets: Anodizing, Black Oxide, Chromate (Chem Film), Zinc/Copper/Nickel/Silver/Gold Plating, Electroless Nickel (EN), Nickel+Cr, Phosphating, Passivation, Electrodeposit Chromium, Cadmium, Chem Clean/Polish/Electropolish, Blueing, Other Non-CR Surface, Cleanroom, **NDT (FPI/MPT/ET/UT/RT)**, Coating & Others.
- **MasterList** (238 rows): `Process | Industry Category/Customer | Specification | Tier 1–4 Classification | Max L/W/D`.
- **Tank Capacity** (max dims per process, by Bay), **Equipment** (ovens, NDT sets, sandblast), **HIST** (rev control).
- ~33 customers/categories: General, Aerospace (SAE AMS), **Boeing, Airbus (Jin Pao SEP014), Pratt & Whitney (SPOP-311), Meggitt (EPRO/Billion/ONN WAH), Honeywell, SIA/SIAEC, ST Engineering, Standard Aero, Abbott, Baker Hughes, Vallourec, Liebherr, MTU**, plus semiconductor (ASML, LAM, Applied Materials, Mattson, MKS, AB SCIEX, Amphenol, ASM, SEMI…).

---

# PART A — Split FPI Tanks from Chemical Processing (MOD-06)

## A.1 Problem

`dbo.ChemBath` (migration 007) currently mixes two distinct process families in one register:
- **NDT / FPI tanks** — `PENETRANT`, `EMULSIFIER`, `DEVELOPER`, `RINSE` (ASTM E1417 / AMS 2644). These belong to **NDT** (PCM "NDT" sheet, MOD-03 FPI process).
- **Chemical processing / electroplating baths** — `ANODIZE`, `PLATING`, `PASSIVATION`, `CONVERSION`, `COATING` (NADCAP AC7108/AC7110). These are **electroplating** per the PCM.

The MOD-06 page shows them in one undifferentiated register, with one KPI set.

## A.2 Solution — `process_category` discriminator + split UI

Add a category column and present the two families separately (separate registers, KPIs, and out-of-spec workflows) while keeping the shared sampling engine (`BathParameter` / `BathSample` / `BathSampleParam`).

### Migration `029_mod06_split_fpi_electroplating.sql`
```sql
ALTER TABLE dbo.ChemBath
  ADD process_category NVARCHAR(20) NOT NULL DEFAULT 'ELECTROPLATING'
      CONSTRAINT CK_ChemBath_ProcCat CHECK (process_category IN ('NDT_FPI','ELECTROPLATING'));

-- Backfill from existing bath_type
UPDATE dbo.ChemBath
   SET process_category = 'NDT_FPI'
 WHERE bath_type IN ('PENETRANT','EMULSIFIER','DEVELOPER','RINSE');
-- (all others remain 'ELECTROPLATING')

-- Extend bath_type CHECK to the PCM electroplating processes
ALTER TABLE dbo.ChemBath DROP CONSTRAINT <existing bath_type check>;  -- name lookup at apply time
ALTER TABLE dbo.ChemBath ADD CONSTRAINT CK_ChemBath_Type CHECK (bath_type IN (
  -- NDT_FPI
  'PENETRANT','EMULSIFIER','DEVELOPER','RINSE',
  -- ELECTROPLATING (PCM)
  'ANODIZE','BLACK_OXIDE','CHROMATE','ZINC_PLATE','COPPER_PLATE','NICKEL_PLATE',
  'ELECTROLESS_NICKEL','SILVER_PLATE','GOLD_PLATE','PHOSPHATING','PASSIVATION',
  'HARD_CHROME','CADMIUM','ELECTROPOLISH','BLUEING','CONVERSION','COATING','PLATING'
));

-- Optional: max-dimension columns sourced from PCM "Tank Capacity"
ALTER TABLE dbo.ChemBath ADD
  max_len_cm DECIMAL(6,1) NULL, max_wid_cm DECIMAL(6,1) NULL, max_dep_cm DECIMAL(6,1) NULL,
  bay NVARCHAR(20) NULL;   -- 'Bay 2'..'Bay 5'
```
`vw_BathStatus` gains `process_category` (and bay/dims) — single-line view change.

### Backend (`api/chemical-bath-control/`)
- `GET /mod06/baths?category=NDT_FPI|ELECTROPLATING` — filter param.
- `GET /mod06/alerts/summary` → split into two nested objects:
  ```json
  { "fpi":  {"out_of_spec":0,"overdue_sample":1,"due_soon":1,"total_baths":4},
    "plating":{"out_of_spec":2,"overdue_sample":1,"due_soon":3,"total_baths":N},
    "out_of_spec":2,"overdue_sample":2,"due_soon":4,"total_baths":N,"total":N }
  ```
  (Top-level keys kept for backward-compat with MOD-15 dashboard & demo parity §7.)

### Frontend (`modules/mod06-bath-control/index.html`)
- Re-title: **"MOD-06 — Chemical Processing (Electroplating) & FPI Tank Control"**.
- Two tabs:
  1. **FPI Process Tanks (NDT)** — ASTM E1417 / AMS 2644; penetrant/emulsifier/developer/rinse.
  2. **Electroplating / Chemical Processing Baths** — NADCAP AC7108/AC7110; anodize/plating/EN/passivation/etc., with Bay + max-dim columns from PCM.
- Separate KPI rows per tab; each tab filters `?category=`.
- Cross-link: FPI tab references MOD-03 FPI Process; each electroplating bath can link to its PCM capability (Part B) and qualified customers (Part C).

### Seed additions (electroplating baths from PCM)
Add representative electroplating baths so the new tab is populated: Type II Sulfuric Anodize (Bay 5), Hard Anodize, Chromate/Chem-Film (Bay 5), Electroless Nickel HP (Bay 4, P&W HPEN), Zinc Plate (Bay 3), Copper Trim (Bay 2, SIA), Phosphating (Bay 2), Passivation (Bay 4), Cadmium (Bay 4), Silver (Bay 4), Black Oxide (Bay 2) — with parameter limits and `bay`/`max_*_cm` from the PCM "Tank Capacity" sheet.

---

# PART B — MOD-28 Process Capability Master (PCM)

A reference register mirroring `ATC-PCM-001`: **what ATC can process, to which spec, for which customer**, with size limits. Read-mostly master data; the single source of truth that MOD-29 qualifications point at.

## B.1 Database — migration `030_mod28_pcm.sql`

```sql
-- Process family lookup (the 23 PCM process sheets, grouped)
CREATE TABLE dbo.PcmProcess (
  pcm_process_id  INT IDENTITY(1,1) PRIMARY KEY,
  process_name    NVARCHAR(120) NOT NULL UNIQUE,   -- 'Anodizing','Electroless Nickel',...
  process_group   NVARCHAR(30)  NOT NULL,          -- 'ELECTROPLATING' | 'NDT' | 'CLEANROOM' | 'COATING' | 'OTHER'
  bay             NVARCHAR(20)  NULL,
  max_len_cm      DECIMAL(6,1)  NULL,
  max_wid_cm      DECIMAL(6,1)  NULL,
  max_dep_cm      DECIMAL(6,1)  NULL,
  is_upcoming     BIT NOT NULL DEFAULT 0,           -- PCM "red font / upcoming service"
  is_active       BIT NOT NULL DEFAULT 1
);

-- One row per (process, customer/category, specification) capability — the MasterList grain
CREATE TABLE dbo.PcmCapability (
  capability_id   INT IDENTITY(1,1) PRIMARY KEY,
  capability_ref  NVARCHAR(20)  NOT NULL UNIQUE,    -- PCM-2026-0001
  pcm_process_id  INT NOT NULL REFERENCES dbo.PcmProcess(pcm_process_id),
  customer_category NVARCHAR(120) NOT NULL,         -- 'General','Boeing','Airbus (Jin Pao)','Pratt & Whitney',...
  customer_id     INT NULL REFERENCES dbo.Customer(customer_id),  -- link to MOD-09 where known
  specification   NVARCHAR(300) NOT NULL,           -- 'BAC 5019 Rev AA','SEP014 Indice D','SPOP-311','AMS2470R'...
  tier1_class     NVARCHAR(MAX) NULL,               -- 'Type II: Sulfuric acid anodizing'
  tier2_class     NVARCHAR(MAX) NULL,
  tier3_class     NVARCHAR(MAX) NULL,
  tier4_class     NVARCHAR(MAX) NULL,
  max_len_cm      DECIMAL(6,1)  NULL,
  max_wid_cm      DECIMAL(6,1)  NULL,
  max_dep_cm      DECIMAL(6,1)  NULL,
  is_upcoming     BIT NOT NULL DEFAULT 0,
  notes           NVARCHAR(MAX) NULL,
  is_active       BIT NOT NULL DEFAULT 1,
  created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE dbo.Mod28Sequence (seq_key NVARCHAR(20) PRIMARY KEY, last_num INT NOT NULL DEFAULT 0);
INSERT INTO dbo.Mod28Sequence VALUES ('CAPABILITY',0);

-- Revision header mirroring PCM HIST sheet
CREATE TABLE dbo.PcmRevision (
  rev_id INT IDENTITY(1,1) PRIMARY KEY,
  document_no NVARCHAR(30) NOT NULL DEFAULT 'ATC-PCM-001',
  revision NVARCHAR(5) NOT NULL,            -- 'A'
  rev_date DATE NOT NULL,
  originator NVARCHAR(100) NULL,
  change_details NVARCHAR(MAX) NULL,
  reason NVARCHAR(MAX) NULL
);
```

## B.2 PCM import (one-off)

Script `tools/import_pcm.py` (openpyxl) reads `ATC-PCM-001 REV A.xlsx`:
- `MasterList` → `PcmProcess` (distinct process + group + dims from Tank Capacity) and `PcmCapability` (one row per process×customer×spec, tiers carried verbatim; red-font cells → `is_upcoming=1`).
- `HIST` → `PcmRevision`.
Output: a `031_pcm_seed.sql` (or direct insert) so prod and preview share the data. Demo data also gets a representative subset in `atca-demo.js`.

## B.3 Backend `api/mod28/index.js`
| Endpoint | RBAC | Returns |
|---|---|---|
| `GET /mod28/alerts/summary` | NDT_INSPECTOR+ | `{total_capabilities, processes, customers, upcoming_services, total}` |
| `GET /mod28/processes` | NDT_INSPECTOR+ | grouped process list (+ dims, bay, upcoming) |
| `GET /mod28/capabilities?process=&customer=&q=` | NDT_INSPECTOR+ | `{items,total}` filtered capability rows |
| `GET /mod28/capabilities/:id` | NDT_INSPECTOR+ | full record (tiers, dims, linked qualifications) |
| `POST/PUT /mod28/capabilities` | ENGINEER+ | create/edit (audit-logged) |
| `GET /mod28/revisions` | NDT_INSPECTOR+ | PCM rev history |

## B.4 Frontend `modules/mod28-pcm/index.html`
- Title: **"MOD-28 — Process Capability Master (ATC-PCM-001)"**, badge `Rev A`.
- KPI tiles: Total Capabilities · Processes · Customers · Upcoming Services.
- Tabs: **Capability Matrix** (filterable table: Process | Customer | Spec | Classifications | Max L×W×D | status), **Processes** (group cards with Bay + size envelope), **Revision History**.
- Filter chips by `process_group` (Electroplating / NDT / Cleanroom / Coating) and by customer.
- Each capability row links to "Qualify a customer for this" → MOD-29.

---

# PART C — MOD-29 Customer Qualification

Manages the **qualification lifecycle**: a customer formally qualifies ATC to perform a PCM capability, through five stages, then recurring periodic audits.

## C.1 Lifecycle (state machine)

```
[1 GAP_ANALYSIS] → [2 GAP_CLOSURE] → [3 QUALIFICATION] → [4 AWARD] → [5 PERIODIC_AUDIT]
       │                  │                   │              │              │
   identify gaps      action items        trial/FAI/      approval +    recurring
   vs customer spec   to close each       audit by        certificate    surveillance
   & PCM capability   gap (owner,due)     customer/3rd    (valid_from/    (interval;
                                          party           valid_to)       re-qualify)
```

| Stage | Status value | Enter criteria | Exit criteria |
|---|---|---|---|
| 1 Gap Analysis | `GAP_ANALYSIS` | qualification raised vs a PCM capability + customer | all gaps logged, analysis signed (ENGINEER+) |
| 2 Close Gap | `GAP_CLOSURE` | ≥1 open gap | every gap `CLOSED` (owner + evidence) |
| 3 Qualification | `QUALIFICATION` | gaps closed | trial/FAI/audit result recorded |
| 4 Closing & Award | `AWARD` | qualification result = PASS | certificate no., valid_from, valid_to set (QA_MANAGER) |
| 5 Periodic Audit | `PERIODIC_AUDIT` (recurring) | awarded | each audit logged; on expiry → `RE_QUALIFY` or `EXPIRED` |

Terminal/auxiliary: `ON_HOLD`, `REJECTED`, `EXPIRED`, `WITHDRAWN`.

## C.2 Database — migration `032_mod29_qualification.sql`

```sql
CREATE TABLE dbo.CustomerQualification (
  qual_id        INT IDENTITY(1,1) PRIMARY KEY,
  qual_ref       NVARCHAR(20) NOT NULL UNIQUE,         -- QUAL-2026-0001
  customer_id    INT NULL REFERENCES dbo.Customer(customer_id),
  customer_name  NVARCHAR(200) NOT NULL,               -- denormalised (PCM categories incl. non-MOD09 names)
  capability_id  INT NULL REFERENCES dbo.PcmCapability(capability_id),
  process_name   NVARCHAR(120) NOT NULL,               -- snapshot
  specification  NVARCHAR(300) NOT NULL,               -- customer spec being qualified to
  status         NVARCHAR(20) NOT NULL DEFAULT 'GAP_ANALYSIS',
  -- award
  certificate_no NVARCHAR(60)  NULL,
  approval_authority NVARCHAR(120) NULL,               -- customer SQE / NADCAP / internal
  valid_from     DATE NULL,
  valid_to       DATE NULL,
  audit_interval_months INT NULL DEFAULT 12,
  next_audit_due DATE NULL,
  -- meta
  lead_id        INT NULL REFERENCES dbo.Personnel(personnel_id),
  notes          NVARCHAR(MAX) NULL,
  created_by     INT NOT NULL,
  created_at     DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at     DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  is_active      BIT NOT NULL DEFAULT 1
);

-- Stage 1/2: gap items
CREATE TABLE dbo.QualGap (
  gap_id      INT IDENTITY(1,1) PRIMARY KEY,
  qual_id     INT NOT NULL REFERENCES dbo.CustomerQualification(qual_id),
  gap_no      INT NOT NULL,                             -- sequence per qual
  requirement NVARCHAR(MAX) NOT NULL,                   -- customer/spec clause
  current_state NVARCHAR(MAX) NULL,
  gap_desc    NVARCHAR(MAX) NOT NULL,
  severity    NVARCHAR(10) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  action      NVARCHAR(MAX) NULL,                       -- close-gap action
  owner_id    INT NULL REFERENCES dbo.Personnel(personnel_id),
  due_date    DATE NULL,
  evidence_ref NVARCHAR(200) NULL,
  status      NVARCHAR(12) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','CLOSED')),
  closed_date DATE NULL,
  ncr_id      INT NULL REFERENCES dbo.NCR(ncr_id)       -- escalate a gap to NCR (MOD-07)
);

-- Stage 3: qualification activity (trial/FAI/audit)
CREATE TABLE dbo.QualActivity (
  activity_id INT IDENTITY(1,1) PRIMARY KEY,
  qual_id     INT NOT NULL REFERENCES dbo.CustomerQualification(qual_id),
  activity_type NVARCHAR(20) NOT NULL CHECK (activity_type IN ('TRIAL','FAI','CUSTOMER_AUDIT','THIRD_PARTY_AUDIT','DOC_REVIEW')),
  activity_date DATE NULL,
  performed_by NVARCHAR(120) NULL,
  result      NVARCHAR(12) NULL CHECK (result IN ('PASS','FAIL','CONDITIONAL',NULL)),
  report_ref  NVARCHAR(200) NULL,
  notes       NVARCHAR(MAX) NULL
);

-- Stage 5: periodic audits (recurring surveillance)
CREATE TABLE dbo.QualPeriodicAudit (
  audit_id    INT IDENTITY(1,1) PRIMARY KEY,
  qual_id     INT NOT NULL REFERENCES dbo.CustomerQualification(qual_id),
  audit_no    INT NOT NULL,
  scheduled_date DATE NULL,
  actual_date  DATE NULL,
  auditor     NVARCHAR(120) NULL,
  result      NVARCHAR(12) NULL CHECK (result IN ('PASS','FAIL','CONDITIONAL',NULL)),
  findings    NVARCHAR(MAX) NULL,
  audit_plan_id INT NULL REFERENCES dbo.AuditPlan(audit_plan_id),  -- link to MOD-08
  next_due    DATE NULL
);

CREATE TABLE dbo.Mod29Sequence (seq_key NVARCHAR(20) PRIMARY KEY, last_num INT NOT NULL DEFAULT 0, last_year INT NOT NULL DEFAULT 2026);
INSERT INTO dbo.Mod29Sequence VALUES ('QUALIFICATION',0,2026);
```

## C.3 Backend `api/mod29/index.js`
| Endpoint | RBAC | Purpose |
|---|---|---|
| `GET /mod29/alerts/summary` | NDT_INSPECTOR+ | `{in_gap_analysis, gaps_open, in_qualification, awarded_active, audits_due, expiring_90d, total}` |
| `GET /mod29/qualifications?status=&customer=` | NDT_INSPECTOR+ | list (with stage + gap progress) |
| `POST /mod29/qualifications` | ENGINEER+ | raise vs a PCM capability + customer |
| `GET /mod29/qualifications/:id` | NDT_INSPECTOR+ | full record (gaps, activities, audits) |
| `POST /mod29/:id/gaps` · `PUT /gaps/:gid` | ENGINEER+ | add/update/close gap; optional NCR escalation |
| `POST /mod29/:id/advance` | role-gated per stage | advance state with entry-criteria guard |
| `POST /mod29/:id/activities` | ENGINEER+ | record trial/FAI/audit result |
| `POST /mod29/:id/award` | **QA_MANAGER+** | set certificate_no, valid_from/to, interval → compute next_audit_due |
| `POST /mod29/:id/periodic-audits` | SUPERVISOR+ | log a periodic audit; roll next_due |

**Guards (compliance-critical):**
- Cannot advance Gap Analysis → Qualification while any gap is `OPEN`/`IN_PROGRESS`.
- Cannot Award unless latest qualifying `QualActivity.result = 'PASS'`.
- Award requires `valid_from`, `valid_to`, `certificate_no`; sets `next_audit_due = valid_from + interval`.
- Every transition `auditLog(... moduleId:'MOD-29')`.

## C.4 Frontend `modules/mod29-qualification/index.html`
- Title: **"MOD-29 — Customer Qualification"**, subtitle "Gap Analysis → Close Gap → Qualification → Award → Periodic Audit".
- KPI tiles: In Gap Analysis · Open Gaps · In Qualification · Active (Awarded) · Audits Due.
- **Register tab**: qualifications table (Ref | Customer | Process | Spec | Stage badge | Gap progress | Valid-to | Next audit).
- **Detail view** (modal/page) with a **5-step stage tracker** (reuses the MOD-27 vf-stage style): Gap Analysis · Close Gap · Qualification · Award · Periodic Audit — current stage highlighted; per-stage panel:
  1. Gap table (add/close, severity, owner, due, → NCR).
  2. Close-gap progress (closed/total).
  3. Qualification activities (trial/FAI/audit + result).
  4. Award form (cert no., validity, interval) — QA_MANAGER only.
  5. Periodic-audit log + next-due RAG.
- "New Qualification" picks a **PCM capability** (Part B) + customer → snapshots process/spec.

## C.5 Cross-module links
- **MOD-28 PCM**: source of process/spec/customer; "Qualify" button deep-links here.
- **MOD-07 NCR**: a gap may escalate to an NCR.
- **MOD-08 Audit**: a periodic audit may link to an Audit Plan.
- **MOD-09 Customer**: customer_id where the PCM category maps to a real customer.
- **MOD-15 Dashboard**: `audits_due` / `expiring_90d` roll into the compliance health ring.

---

## 3. Wiring & cross-cutting (all parts)

- `server.js`: mount `/mod06` (unchanged route, new param), `/mod28`, `/mod29`.
- `preview_server.py`: stubs for mod06 split summary, mod28 (processes, capabilities, revisions), mod29 (summary, list, detail).
- `assets/js/atca-demo.js`: demo entries for mod28 + mod29 + the new mod06 split summary — **field names must match each page's `loadKpis()`** (TEST-PLAN §7 / R-08).
- Home `index.html`: add MOD-28 + MOD-29 cards (SYSTEM/Quality group) + sidebar entries (load `atca-demo.js?v` before `atca-core.js?v`).
- All new pages: Layout A, `ATCA.initPage()`, `?v` cache-bust bump, UTF-8 no-BOM.

## 4. Documentation to update (md-protocol)
`MEMORY.md`, `README.md`, `memory/project-overview.md`, `TEST-PLAN.md` (new §3.16 MOD-28, §3.17 MOD-29 integration + RBAC + the qualification state-guard regression; §7 alert contracts for mod06-split/mod28/mod29; §15 demo sweep now 32 pages).

## 5. Implementation sequence

| Step | Task | Effort |
|---|---|---|
| A1 | Migration 029 (ChemBath `process_category` + types + dims) + backfill | 0.5h |
| A2 | MOD-06 backend split (`?category`, nested summary) + seed electroplating baths | 1.5h |
| A3 | MOD-06 frontend: 2 tabs, per-tab KPIs, re-title | 2h |
| B1 | Migration 030 (PcmProcess/PcmCapability/PcmRevision) | 1h |
| B2 | `tools/import_pcm.py` → seed from `ATC-PCM-001 REV A.xlsx` | 2h |
| B3 | MOD-28 backend + frontend (matrix, processes, revisions) | 4h |
| C1 | Migration 032 (Qualification + Gap + Activity + PeriodicAudit) | 1h |
| C2 | MOD-29 backend (state machine + guards + award) | 4h |
| C3 | MOD-29 frontend (register + 5-stage tracker detail) | 5h |
| W | Wiring (server, stubs, demo, home, sidebars) | 1.5h |
| D | Docs (.md) + preview verification sweep | 2h |
| **Total** | | **~28h** |

**Suggested build order:** Part A (self-contained, immediate value) → Part B (PCM data foundation) → Part C (depends on B). Each part is independently shippable/deployable.

## 6. Open decisions (defaults chosen; change on request)
1. **FPI split style** — *default:* one MOD-06 page, two tabs + `process_category` (lowest risk, keeps shared sampling). *Alt:* move FPI tanks under MOD-03.
2. **PCM import scope** — *default:* import full MasterList (all customers/specs) as `PcmCapability`; per-process detailed bath chemistry stays summarised in `notes` (full chemistry can be a later phase). 
3. **Customer linkage** — *default:* `customer_name` free-text snapshot + best-effort `customer_id` link to MOD-09 (PCM has non-MOD09 categories like "General"/semiconductor).
4. **Module numbers** — *default:* MOD-28 = PCM, MOD-29 = Customer Qualification.

---

*End of PCM / FPI-split / Customer-Qualification Dev Plan.*
