# ATCA-ERP — Forward Roadmap (Phases 9–14)
**ATC Aviation Pte Ltd | NADCAP special-process + NDT job shop (Singapore)**
**Authored:** 2026-06-17 | **Last Updated:** 2026-06-30 | **Status:** PHASES 9–12 BUILT · PHASE 13 PARTIAL · PHASE 14 PLANNED

This roadmap turns the structure-driven feature suggestions into sequenced, shippable phases. It is grounded in **ATC's actual structure** as evidenced by `ATC-PCM-001` (bays, tanks, ovens, customers), the SoR, and the 29 modules already built — *not* a generic ERP backlog.

> **Built to date (Phases 1–12 + enhancements):** MOD-01…MOD-36, Change Log, Bug Report, Internal Chat, KPI Dashboard, Value Flow Tracker, Process Capability Master (PCM), Customer Qualification, MOD-06 FPI/Electroplating split, plus **MOD-14 major enhancement (2026-06-24)**: lot expiry tracking, Lot Expiry tab, LOT_EXTENSION + DISPOSAL approval flows via `atca_pending_approvals`, Item Lots modal, Scrap popup, vendor/AVL + lead-time per item. See `MEMORY.md` / `MOD14-ENHANCEMENT-2026-06-24.md` / `PCM-QUAL-DEVPLAN.md`.

## Company structure (the lens for every phase)

| Area (from PCM) | Scope |
|---|---|
| **Bays 2–5** | Electroplating / chemical processing (anodise, EN, plating, phosphating, passivation, black oxide, cadmium, silver, gold) |
| **ApolloFlow & NDT** | FPI, MPI, RT/X-Ray, welding, pressure test, cutting/drilling |
| **Heat-treat** | ~10 ovens (ATCT OVEN 4–16) under **AMS 2750H**, some aerospace-only |
| **Cleanroom** | Semiconductor pre-treatment, PVD/CVD (upcoming), N₂ drying |
| **Markets** | Aerospace (Boeing, Airbus, P&W, Meggitt, Honeywell, SIA, ST Eng, Liebherr, MTU…) **+** Semiconductor (ASML, LAM, Applied Materials, Mattson, MKS, Amphenol, ASM…) |
| **Workforce** | Shift operators across bays (dormitory-housed; WhatsApp-coordinated daily ops) |

---

## Phase 9 — Special-Process Compliance Core  ✅ BUILT 2026-06-17
*Theme: close the biggest unaddressed NADCAP gaps for the heat-treat + shop floor.*

> **Built:** MOD-30 (migration 033, api/mod30, modules/mod30-pyrometry — oven register seeded from the PCM Equipment sheet, TUS/SAT tests, thermocouple expiry, aerospace-only **routing check**) and MOD-31 (migration 034, api/mod31, modules/mod31-operator-competency — competency matrix operator×process×customer×bay, **PIN-verified sign-off = electronic signature** with competency gate + audit). Mounted /mod30 + /mod31; home cards + sidebar; demo via tools/mod30_demo.json + tools/mod31_demo.json. Preview-verified: MOD-30 10 ovens/4 TCs/routing, MOD-31 11 competencies/4 sign-offs. Electronic Signature realised as the MOD-31 PIN mechanism.

| Module | Feature | Ties to structure | Compliance | Key build |
|---|---|---|---|---|
| **MOD-30** | **Pyrometry & Heat-Treat** | 10 AMS 2750H ovens with per-oven temp ranges + "aerospace-only" rules | **NADCAP AC7102 / AMS 2750H** | Oven register, **TUS** & **SAT** schedules, thermocouple calibration & expiry, instrument classes, aerospace-only routing gate on travelers |
| **MOD-31** | **Operator Competency & PIN Sign-off** | Shift operators per bay; MOD-29 gaps are literally "operator not BAC-certified / needs SEP014 training" | **NAS410 §**, AS9100D §7.2, NADCAP frozen-process | Competency matrix (operator × process × customer × bay), validity/expiry, **PIN-gated traveler step sign-off** — only an *approved* operator can sign |
| *(x-cut)* | **Electronic Signature** | Non-repudiation for sign-offs above | NADCAP AAM | Bound to MOD-31 PIN; timestamped, non-transferable, audit-logged |

**Why first:** heat-treat pyrometry is the single largest compliance area with **zero** current coverage, and operator approval closes the loop between MOD-04 (NAS410), MOD-29 (qualification), and the actual shop floor. Both reuse data already in the system (Equipment sheet, Personnel, PCM).
**Dependencies:** MOD-04, MOD-05, MOD-13, MOD-29. **Est:** ~22h.

---

## Phase 10 — Capacity & Process Control  ✅ BUILT 2026-06-20
*Theme: plan the bays and lock the recipes.*

> **Built:** MOD-32 (migration 035, api/mod32, modules/mod32-bay-scheduler — BaySchedule + BayLine tables, tank-fit check inline at POST /schedule, part L×W×D vs ChemBath.max_len_cm/wid/dep, OVERSIZE status + flag on dimension failure, visual bay/shift queue with slot cards; 11 bay lines seeded) and MOD-33 (migration 036, api/mod33, modules/mod33-spec-flowdown — SpecLibrary, SpecParameter, ProcessRecipe, ECN, AAM tables; frozen-spec guard returns 403 with raise-ECN prompt for ENGINEER role; ECN state machine DRAFT→PENDING_REVIEW→PENDING_CUSTOMER→CUSTOMER_APPROVED→APPROVED→IMPLEMENTED; AAM with 2-person-integrity, operator-PIN, QAM-cosign, irreversibility flags; 10 specs + 10 AAM entries seeded; ECN + AAM as cross-cuts). Mounted /mod32 + /mod33; home cards + sidebar; demo via tools/mod32_demo.json + tools/mod33_demo.json (inline in atca-demo.js). Preview-verified: MOD-32 9 scheduled/1 oversize/6 slot cards, MOD-33 10 specs/5 frozen/3 ECNs/10 AAM/5 recipes.

| Module | Feature | Ties to structure | Compliance | Key build |
|---|---|---|---|---|
| **MOD-32** | **Bay Load Scheduler + Tank-Fit** | Every tank has a max envelope in the PCM; jobs must fit a specific bay/line | AS9100D §8.1 (planning) | Validate part **L×W×D vs PCM tank envelope** before scheduling; visual bay/shift queue; manual vs auto line; over-size flagging |
| **MOD-33** | **Spec & Flowdown / Frozen Process Control** | Dozens of customer specs (BAC 5019, SEP014, SPOP-311, EPRO…) drive every process | NADCAP **frozen process**, AS9100D §8.1.x | Spec library, parameter-flowdown from spec → process recipe, **frozen-parameter change requires customer approval (ECN)**, links PCM ↔ Qualification |
| *(x-cut)* | **ECN (Engineering Change Notice)** | Recipe / process changes | AS9100D §8.5.6 | Change workflow with process-impact assessment, feeds MOD-33 frozen control |
| *(x-cut)* | **AAM (Acceptance Authority Matrix)** | Who may accept/release what | AS9100D §8.6, NADCAP | Authorisation register + 2-person rule for destructive/irreversible ops |

**Why second:** turns the capability data (PCM tanks + specs) into operational scheduling and change control; directly leverages the tank-envelope dimensions already imported.
**Dependencies:** MOD-28 (PCM), MOD-29, MOD-13. **Est:** ~26h.

---

## Phase 11 — Chemicals, Safety & Escalation  ✅ BUILT 2026-06-21
*Theme: the regulated-chemical operation and proactive alerting.*

> **Built:** MOD-34 (migration 037, api/mod34, modules/mod34-chemical-hazmat — ChemicalSDS 12-chemical register/ChemicalInventory/BathMakeupFormula/BathReplenishment/EscalationRule/EscalationLog/vw_SDSExpiry/vw_ReplenishmentQueue; SDS register with OVERDUE/DUE_SOON RAG + controlled-substance flags; bath make-up calculator with sequenced addition steps + CONTROLLED SUBSTANCE warning banner; replenishment queue OUT_OF_SPEC/SCHEDULED/LOW_STOCK/MANUAL triggers; 4-tab UI: SDS/Make-up/Inventory/Escalation; Alert Escalation Engine = 10 cross-module escalation rules covering mod06/07/30/31/33/34/05 with CRITICAL/ALERT/WARNING levels, notify-roles, delay configuration, and acknowledge workflow; demo via tools/mod34_demo.json). Preview-verified: KPIs 12/2/2/3, 12 SDS rows, CONTROLLED badge + OVERDUE on cyanide compounds, CAD_PLATE calculator with 2-step sequence and controlled-substance banner, 3 replenishment cards, 10 escalation rules, 2-alert unacknowledged banner.

| Module | Feature | Ties to structure | Compliance | Key build |
|---|---|---|---|---|
| **MOD-34** | **Chemical & Hazmat Control** | Heavy regulated chemistry — cyanide copper, cadmium, nitric/sulfuric/chromic acids across bays | AC7108/AC7110, WSH/SDS, REACH/RoHS | SDS register + expiry, **bath make-up & replenishment calculators**, controlled-substance handling (cyanide/cadmium), links out-of-spec MOD-06 baths → replenishment action |
| *(x-cut)* | **Alert Escalation Engine** | Out-of-spec baths, overdue TUS/SAT, expiring operator/customer approvals | AS9100D §9.1 | Configurable escalation paths/timeframes per module; rolls into MOD-15 dashboard |

**Why third:** consolidates the safety/compliance surface of a chemical house and makes the whole system proactive rather than passively RAG-coded.
**Dependencies:** MOD-06, MOD-19, MOD-30, MOD-15. **Est:** ~18h.

---

## Phase 12 — Compliance Monitoring & Asset Management  ✅ BUILT 2026-06-21
*Theme: proactive renewal tracking for all government/customer/accreditation certs and structured preventive maintenance for all production equipment.*

> **Built:** MOD-35 (migration 038, api/mod35, modules/mod35-regulatory-certs — RegulatoryBody/CertificationRegister/CertRenewalAction/vw_CertExpiry; 10 regulatory bodies; 12 certs across NADCAP/customer/government/ISO categories; OVERDUE/DUE_SOON/OK RAG; configurable renewal lead days per cert; renewal action workflow INITIATE→SUBMIT_APPLICATION→AUDIT_SCHEDULED→AUDIT_COMPLETE→CERT_RECEIVED; 3-tab UI: Dashboard, Certificate Register, Renewal Actions; demo via tools/mod35_demo.json) and MOD-36 (migration 039, api/mod36, modules/mod36-equipment-ppm — EquipmentAsset/PPMSchedule/PPMChecklist/PPMLog/vw_PPMDue; 15 assets across OVEN/TANK/NDT_EQUIPMENT/COMPRESSOR/RECTIFIER/HVAC/INSTRUMENT categories; 12 PM schedules DAILY→WEEKLY→MONTHLY→QUARTERLY→SEMI_ANNUAL→ANNUAL; auto-advance next_due_date on log; OVERDUE/DUE_SOON/OK RAG on 7-day window; 3-tab UI: Dashboard, Equipment Assets, PM Schedule; demo via tools/mod36_demo.json). Preview-verified: MOD-35 12 certs/3 overdue/4 due-soon/7-item attention list; MOD-36 15 assets/4 overdue PM/3 due-soon/7-item attention list/6 recent log entries.

| Module | Feature | Ties to structure | Compliance | Key build |
|---|---|---|---|---|
| **MOD-35** | **Government & Regulatory Certification Renewal Monitoring** | NADCAP accreditations, Boeing/Airbus/P&W/RR customer approvals, MOM/WSHC/CAAS government licenses, AS9100D/ISO registrations | AS9100D §7.1.2, NADCAP (AC7102/AC7108/AC7114), MOM WSH Act, CAAS AMO | Cert register with RAG expiry, configurable renewal lead days per cert, renewal action workflow, body type filtering |
| **MOD-36** | **Equipment Periodic Preventive Maintenance** | All production assets — AMS 2750H ovens (MOD-30), chemical tanks (MOD-32), NDT equipment, compressors, rectifiers, HVAC | AS9100D §7.1.3, AMS 2750H equipment requirements, NADCAP AC7108 tank maintenance | Asset register with MOD-30 oven cross-ref, PM schedules (Daily→Annual), checklist tasks, log + auto-advance next-due, 7-day DUE_SOON window |

**Why this phase:** two of the highest operational risks in an aerospace shop are (1) an expired NADCAP accreditation causing a production stop and (2) unplanned equipment downtime from deferred maintenance. Both are now proactively managed with RAG dashboards and workflow.
**Dependencies:** MOD-30 (oven refs), MOD-34 (chemical tank refs), MOD-04 (personnel). **Est:** ~20h.

---

## Phase 13 — Group Scale & Central Document Store  ✅ PARTIALLY BUILT 2026-06-28 / 2026-06-29

> **Built:** **MOD-37 File Repository** (2026-06-28 — central document store; `ATCA.fileStore` API; localStorage-backed; 11 demo files; AS9100D §7.5). **Multi-entity switcher + Inter-Company Trading** (2026-06-29 — `ATCA.entity` ATCA/ATCT/APF switcher pill in every topbar; `mod-interco` module: Interco PO `ICO-PO-YYYY-NNN`, Interco DO `ICO-DO-YYYY-NNN`, Shared Assets register with `scope:'ALL'`; entity stored in `atca_active_entity`).

| Module | Feature | Status | Compliance | Key build |
|---|---|---|---|---|
| **MOD-37** | **File Repository** | ✅ BUILT 2026-06-28 | AS9100D §7.5 | Central document store; `ATCA.fileStore.put/get/list/open/summary`; `FILE-NNNN`; file tags; cross-module entity linking |
| **Multi-entity** | **Entity switcher + Inter-Company Trading** | ✅ BUILT 2026-06-29 | — | ATCA/ATCT/APF switcher; Interco PO/DO; shared assets (`scope:'ALL'`); per-entity colour badges |
| *(x-cut)* | **Document Template & Rule Engine** | 📋 PLANNED | AS9100D §7.5 | Template engine with compliance-clause injection feeding MOD-24/MOD-29/MOD-30 outputs |
| *(future)* | **Semiconductor Segment** | 📋 PLANNED | SEMI, RoHS/REACH | Cleanliness/ionic certs, particle counts, RoHS/REACH declarations, semicon-specific CoC |

**Note:** MOD-37 was delivered as the **File Repository** (not the originally-sketched Semiconductor Segment, which is deferred). The semiconductor segment and the template/rule engine remain on the backlog.

---

## Phase 14 — Governance, Forms & Change Control  📋 PLANNED (dev plan ready)
*Theme: make every form a controlled record, route all approvals to the QM, surface all approval flows, and gate every form-format change behind QM approval + an isolated trial environment.*

> **Driver:** four cross-cutting governance requirements (2026-06-30). Full design — data models, service APIs (`ATCA.approvals/forms/records/revision/env/approvalFlows`), file lists, sequencing, and 18 test cases — is in **[GOVERNANCE-FORMS-DEVPLAN.md](GOVERNANCE-FORMS-DEVPLAN.md)**.

| Item | Feature | Compliance | Key build |
|---|---|---|---|
| **1** | **QM is the default approver** | AS9100D §8.6 | `ATCA.approvals.defaultApprover()`; final accept gated to QA_MANAGER; MOD-25 default-approver setting |
| **2** | **Forms → Records (3-step sign-off)** | AS9100D §7.5.3 | `ATCA.forms` (raiser→superior→QM PIN chain) → `ATCA.records` → MOD-37 `RECORD` files, withdrawable cross-module |
| **2b** | **All approval flows in MOD-27** | AS9100D §8.5 | `ATCA.approvalFlows` registry → MOD-27 "Approval Flow Map" with live stage counts |
| **3** | **Form-format change control** | AS9100D §8.5.6 | "Request for Revision" button beside every FM number; `atca_revisions` register; QM-approved before deploy |
| **4** | **Isolated trial environment** | NADCAP change control | `ATCA.env` TRIAL sandbox (QM/ADMIN only) + `trial`-branch preview-deploy; production deploy gate |
| **MOD-39** | **Forms, Records & Change Control console** | — | New page: Form Register, Records, Revision Register, Approval Flow Map, Trial Environment |

**Why this phase:** the system already captures data everywhere, but "filled form → signed record → controlled change" is the AS9100D §7.5/§8.5.6 backbone an aerospace QMS is audited on. This phase turns ad-hoc module modals into a single, enforceable governance spine.
**Dependencies:** MOD-18 (org chart / superior), MOD-25 (users), MOD-27 (value flow), MOD-31 (PIN sign-off), MOD-37 (file repo). **Est:** ~26.5h.

---

## Sequencing summary

| Phase | Modules | New module IDs | Theme | Est |
|---|---|---|---|---|
| **9**  | Pyrometry/Heat-Treat · Operator Competency+PIN · E-Sign | MOD-30, MOD-31 | Special-process compliance core | ~22h |
| **10** | Bay Scheduler · Frozen Process/Flowdown · ECN · AAM | MOD-32, MOD-33 | Capacity & process control | ~26h |
| **11** | Chemical/Hazmat · Alert Escalation | MOD-34 | Chemicals, safety & escalation | ~18h |
| **12** | Regulatory Cert Renewal · Equipment PPM | MOD-35, MOD-36 | Compliance monitoring & asset management | ~20h |
| **13** | File Repository ✅ · Multi-entity + Interco ✅ · Template engine 📋 | MOD-37, mod-interco | Group scale & central document store | ~30h |
| **14** | QM default approver · Forms→Records · Approval-flow map · Revision control · Trial env | MOD-39 | Governance, forms & change control | ~26.5h |

**Recommended next:** Phase 14 → governance spine (**[GOVERNANCE-FORMS-DEVPLAN.md](GOVERNANCE-FORMS-DEVPLAN.md)**) — build the shared services first (`ATCA.forms/records/approvals`), then surface flows in MOD-27 + the dashboard, then layer revision + trial control, finishing with the MOD-39 console.

## Notes & open inputs
- This roadmap assumes the structure inferred from `ATC-PCM-001` + SoR + built modules. **If the company-structure presentation slides exist, share them** — they may reorder priorities (e.g. if semiconductor is a nearer-term growth target, Phase 13 moves up).
- Each phase is independently shippable and follows the project's build pattern: dev plan `.md` → migration → backend → frontend → demo/preview data → home/sidebar wiring → docs → preview-verify → deploy.
- Cross-cutting items (E-Sign, ECN, AAM, escalation, multi-entity, template engine) were carried over from the prior "Phase 9 backlog" and slotted where they best support a module phase.

---

*End of ATCA-ERP Roadmap (Phases 9–13).*
