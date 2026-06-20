# ATCA-ERP — Forward Roadmap (Phases 9–12)
**ATC Aviation Pte Ltd | NADCAP special-process + NDT job shop (Singapore)**
**Authored:** 2026-06-17 | **Status:** PLANNED

This roadmap turns the structure-driven feature suggestions into sequenced, shippable phases. It is grounded in **ATC's actual structure** as evidenced by `ATC-PCM-001` (bays, tanks, ovens, customers), the SoR, and the 29 modules already built — *not* a generic ERP backlog.

> **Built to date (Phases 1–8 + recent):** MOD-01…MOD-29, Change Log, Bug Report, Internal Chat, KPI Dashboard, Value Flow Tracker, Process Capability Master (PCM), Customer Qualification, plus the MOD-06 FPI/Electroplating split. See `MEMORY.md` / `PCM-QUAL-DEVPLAN.md`.

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

## Phase 12 — Market Expansion & Group Scale
*Theme: serve the semiconductor segment properly and prepare for multi-entity scale.*

| Module | Feature | Ties to structure | Compliance | Key build |
|---|---|---|---|---|
| **MOD-35** | **Semiconductor Segment** | Cleanroom + ~9 semicon customers (ASML, LAM, Applied Materials…) run to *different* requirements than aerospace | SEMI standards, RoHS/REACH, ultrapure cleanliness | Cleanliness/ionic certs, particle counts, RoHS/REACH declarations, PVD/CVD (upcoming) capability, semicon-specific CoC |
| *(x-cut)* | **Multi-entity Data Isolation** | Group operations / future legal entities | — | Every record tagged to legal entity; row-level scoping |
| *(x-cut)* | **Document Template & Rule Engine** | Auto-generate CoC, FAI, traveler forms with clause injection | AS9100D §7.5 | Template engine with compliance-clause injection feeding MOD-24/MOD-29/MOD-30 outputs |

**Why last:** highest-leverage *new revenue* segment but depends on the special-process core being solid; multi-entity and the template engine are scale enablers, not day-1 needs.
**Dependencies:** MOD-06, MOD-19, MOD-24, MOD-28. **Est:** ~30h.

---

## Sequencing summary

| Phase | Modules | New module IDs | Theme | Est |
|---|---|---|---|---|
| **9** | Pyrometry/Heat-Treat · Operator Competency+PIN · E-Sign | MOD-30, MOD-31 | Special-process compliance core | ~22h |
| **10** | Bay Scheduler · Frozen Process/Flowdown · ECN · AAM | MOD-32, MOD-33 | Capacity & process control | ~26h |
| **11** | Chemical/Hazmat · Alert Escalation | MOD-34 | Chemicals, safety & escalation | ~18h |
| **12** | Semiconductor Segment · Multi-entity · Template engine | MOD-35 | Market expansion & group scale | ~30h |

**Recommended start:** Phase 9 → **MOD-30 Pyrometry & Heat-Treat** (largest compliance gap; data already in the PCM Equipment sheet), then **MOD-31 Operator Competency & PIN**.

## Notes & open inputs
- This roadmap assumes the structure inferred from `ATC-PCM-001` + SoR + built modules. **If the company-structure presentation slides exist, share them** — they may reorder priorities (e.g. if semiconductor is a nearer-term growth target, Phase 12 moves up).
- Each phase is independently shippable and follows the project's build pattern: dev plan `.md` → migration → backend → frontend → demo/preview data → home/sidebar wiring → docs → preview-verify → deploy.
- Cross-cutting items (E-Sign, ECN, AAM, escalation, multi-entity, template engine) were carried over from the prior "Phase 9 backlog" and slotted where they best support a module phase.

---

*End of ATCA-ERP Roadmap (Phases 9–12).*
