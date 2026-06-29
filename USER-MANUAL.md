# ATCA-ERP User Manual

**ATC Aviation Pte Ltd** | AS9100D · NADCAP AC7108 · AC7110 · AC7114 · NAS410  
**System:** ATCA-ERP v1.0 · LAN-Only  
**Last Updated:** 2026-06-28

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Getting Started](#2-getting-started)
3. [Navigation](#3-navigation)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Quality Management](#5-quality-management)
6. [NDT & Laboratory](#6-ndt--laboratory)
7. [Operations](#7-operations)
8. [Business & HR](#8-business--hr)
9. [Process Control](#9-process-control)
10. [Capability & Analytics](#10-capability--analytics)
11. [System](#11-system)
12. [Cross-Module Workflows](#12-cross-module-workflows)
13. [Approval Queue](#13-approval-queue)
14. [File Repository Integration](#14-file-repository-integration)

---

## 1. System Overview

ATCA-ERP is a fully integrated Enterprise Resource Planning system built for aerospace NDT (Non-Destructive Testing) and special process operations. It enforces AS9100D quality standards, NADCAP accreditation requirements, and NAS410 personnel certification compliance across all business functions.

**Key principles:**
- All data is stored on the local LAN — no internet connection required
- Every action carries a compliance tag linking it to the relevant clause (AS9100D §X.X, NADCAP AC7XXX)
- Write operations above Supervisor level require two-factor role confirmation
- Hazardous and explosive precursor materials have enforced storage rules
- Documents and files are tracked with expiry dates and renewal workflows

---

## 2. Getting Started

### Logging In
1. Open a browser and navigate to the ATCA-ERP URL on the local network
2. Enter your username and password
3. Sessions last 8 hours (one shift). You will be warned 5 minutes before expiry with an option to stay logged in

### Home Dashboard
The home screen shows cards for every module. Each card includes the module number, name, and compliance clause. Click any card to open that module.

### Demo / Preview Mode
When the backend is unreachable (e.g., the preview/static deployment), the system enters **Demo Mode** automatically. A banner appears at the bottom of every page. All data is read from bundled demo data; write operations show a toast — "Demo mode — changes not saved."

---

## 3. Navigation

### Sidebar
The left sidebar is the primary navigation. It uses an **accordion layout** — click a section header to expand it and see its modules. Only one section is open at a time. The section containing the current page auto-expands on load.

**Sections:**
| Section | Contains |
|---|---|
| Quality Management | QMS, Document Control, NCR & CAPA, Audit, Complaints |
| NDT & Laboratory | FPI, MPT, Personnel, Calibration, Bath Control, Lab |
| Operations | Sales, Production, Work Order, CoC, Maintenance, Purchasing, Inventory |
| Business & HR | Finance, HR, Communications, Leave, Payroll |
| Process Control | Pyrometry, Operator Competency, Bay Scheduler, Spec, Chemical & Hazmat, Regulatory Certs, Equipment PPM |
| Capability & Analytics | Capability Master, Customer Qualification, KPI Dashboard, Value Flow, My Dashboard |
| System | User Management, File Repository, Internal Chat, Maintenance Console, Change Log, Bug Report, User Guide |

### Topbar
The topbar shows:
- **Home button** (⌂) — returns to the main dashboard from any page
- **Module title and compliance clause**
- **Alert bell** — shows count of active system alerts; click to view
- **User pill** — shows your name and role; click to access your profile or log out

### RAG Status (Red / Amber / Green)
KPI cards across the system use a colour-coded RAG system:
- 🔴 **Red** — critical / out of compliance / immediate action required
- 🟡 **Amber** — approaching threshold / low stock / expiring soon
- 🟢 **Green** — within limits / adequate

---

## 4. User Roles & Permissions

Roles are hierarchical — each role inherits the permissions of all roles below it.

| Role | Level | Typical User |
|---|---|---|
| `READONLY` | 1 | Auditor, visitor |
| `NDT_INSPECTOR` | 2 | FPI/MPT technician |
| `SUPERVISOR` | 3 | Shift supervisor, bay lead |
| `ENGINEER` | 4 | Process engineer, QA engineer |
| `QA_MANAGER` | 5 | Quality manager |
| `ADMIN` | 6 | IT administrator, superuser |

**Common permission gates:**
- Viewing records: `READONLY` and above
- Recording process steps / stock movements: `NDT_INSPECTOR` and above
- Approving movements and decisions: `SUPERVISOR` and above
- Creating/editing master data (specs, certs, equipment): `ENGINEER` and above
- QA-level approvals (NCR close, ECN approve, CoC issue): `QA_MANAGER` and above
- System administration: `ADMIN` only

---

## 5. Quality Management

### MOD-01 — QMS Core
**Compliance:** AS9100D §4–§6, §9.3

The central repository for all Quality Management System documentation and reviews.

**Tabs:**
- **Policy** — View and update the Quality Policy document
- **Objectives** — Define, assign, and track quality objectives with target dates and owners
- **Management Review** — Record management review meetings (schedule, participants, input items, action items)
- **Risk Register** — Log and monitor quality risks with likelihood × impact scoring; assign mitigation actions

**Key workflow — Raising a Risk:**
1. Go to Risk Register tab → New Risk
2. Enter description, likelihood (1–5), impact (1–5), category, and owner
3. The system calculates Risk Score = Likelihood × Impact
4. Assign a mitigation action and target date
5. Risk status automatically becomes `CLOSED` when mitigation is complete

**Who uses it:** QA Manager (writes), all staff (reads policy)

---

### MOD-02 — Document Control
**Compliance:** AS9100D §7.5

Controls all controlled documents — procedures, work instructions, specifications, and forms.

**Key concepts:**
- **Document number** — auto-assigned (DOC-YYYY-NNNN)
- **Revision** — every update creates a new revision; old revisions are retained for the configured retention period
- **Status** — DRAFT → ACTIVE → OBSOLETE
- **Retention** — configurable per document type; system flags documents for archival when retention expires

**Key workflow — Issuing a New Document:**
1. New Document → enter title, type, owner, and classification
2. Upload the file; set an expiry date if applicable
3. Submit for review — status moves to DRAFT
4. QA Manager approves → status moves to ACTIVE
5. Old revision is automatically set to OBSOLETE

**Who uses it:** Engineer (creates), QA Manager (approves), all staff (reads)

---

### MOD-07 — NCR & CAPA
**Compliance:** AS9100D §10.2

Manages Non-Conformance Reports and Corrective Action and Preventive Action records.

**Key concepts:**
- **NCR** — raised when a product, process, or material does not meet requirements
- **CAPA** — a structured corrective/preventive response linked to one or more NCRs
- **NCR status flow:** OPEN → UNDER_REVIEW → CAPA_RAISED → CLOSED
- **CAPA status flow:** OPEN → IN_PROGRESS → PENDING_VERIFICATION → VERIFIED → CLOSED

**Key workflow — Raising an NCR:**
1. New NCR → enter description, area, product/part affected, severity (MINOR / MAJOR / CRITICAL)
2. Assign an owner and due date
3. Investigate root cause → record findings
4. Raise a CAPA from within the NCR (links automatically)
5. QA Manager verifies corrective action effectiveness → closes both NCR and CAPA

**Who uses it:** NDT Inspector and above (raises NCR), QA Manager (closes/verifies)

---

### MOD-08 — Audit Management
**Compliance:** AS9100D §9.2

Plans, tracks, and closes internal audits and their findings.

**Tabs:**
- **Audit Plans** — schedule and manage audit events (internal, NADCAP, customer, surveillance)
- **Findings Register** — all audit findings (AF- numbered) with responses and verification status

**Key workflow — Conducting an Audit:**
1. Audit Plans → New Audit Plan → enter scope, date, lead auditor, type
2. During or after audit: raise findings under the plan — each gets an AF- number
3. Responsible party enters a Response and Correction
4. QA Manager verifies effectiveness → finding is CLOSED
5. Audit plan is closed when all findings are closed

**Who uses it:** QA Manager (creates plans, verifies), Engineer (responds to findings)

---

### MOD-20 — Customer Complaint & 8D Report
**Compliance:** AS9100D §9.1.2, §10.2, NADCAP AC7114 §10

Records and resolves customer complaints using the 8 Disciplines (8D) methodology.

**Tabs:**
- **Complaints** — register and track complaints (CMP- numbered)
- **8D Reports** — structured D1–D8 problem solving linked to complaints

**8D workflow:**
| Step | Description |
|---|---|
| D1 | Form the team |
| D2 | Describe the problem |
| D3 | Interim containment actions |
| D4 | Root cause analysis |
| D5 | Permanent corrective actions |
| D6 | Implement and validate |
| D7 | Preventive actions |
| D8 | Recognise the team |

**Who uses it:** Customer Service (raises complaint), QA Manager (approves, closes)

---

## 6. NDT & Laboratory

### MOD-03 — FPI Process (Fluorescent Penetrant Inspection)
**Compliance:** NADCAP AC7114, AS9100D §8.5.1

Records and manages FPI jobs through the complete 8-step inspection process.

**8-step traveler:**
1. Pre-clean
2. Penetrant Application
3. Dwell Time
4. Emulsification (if applicable)
5. Water Wash
6. Developer Application
7. Inspection
8. Post-clean

**Key workflow — Running a Job:**
1. New Job — enter part number, customer, work order reference, technique
2. Each step is signed off by a qualified inspector (NAS410 PT Level II minimum)
3. System enforces sequential completion — cannot skip steps
4. At Inspection (Step 7): record result as ACCEPT, REJECT, or CONDITIONAL
5. Disposition options: ACCEPT / REJECT / REWORK — links to NCR if rejected
6. Job is closed when all steps are signed off and disposition is recorded

**Who uses it:** NDT Inspector (process steps), Supervisor (disposition)

---

### MOD-17 — MPT Process (Magnetic Particle Testing)
**Compliance:** NADCAP AC7114, AS9100D §8.5.1

Records MPT jobs through the 6-step AC7114-aligned process.

**6 steps (auto-inserted per AC7114):**
1. Pre-clean
2. Equipment Setup
3. Magnetisation
4. Particle Application
5. Inspection
6. Post-clean / Demagnetise

**Technique badges:** Wet Fluorescent / Wet Visible / Dry Powder / Continuous / Residual

Process is the same sign-off pattern as FPI. Jobs are MPT-numbered.

**Who uses it:** NDT Inspector (Level II MT minimum), Supervisor (disposition)

---

### MOD-04 — NDT Personnel / NAS410
**Compliance:** NAS410, NADCAP AC7114 §4.1

Maintains the full personnel certification register for NDT operators and inspectors.

**Key data tracked:**
- NAS410 certification level (Level I / II / III) per method (PT, MT, UT, RT, ET, VT)
- Certification expiry dates — system flags OVERDUE and DUE_SOON (60 days)
- Eye examination records — annual requirement, flagged at 60 days
- Customer-specific approvals (e.g., Rolls-Royce, Boeing)

**Key workflow — Renewing a Certification:**
1. System flags expiring cert in KPI cards and alert bell
2. Personnel tab → find the person → Edit → update certification date and upload new cert document
3. Status auto-recalculates to CURRENT

**Who uses it:** QA Manager (manages certs), Engineer (adds/edits personnel)

---

### MOD-05 — Equipment & Calibration
**Compliance:** AS9100D §7.1.5, NADCAP AC7108/AC7110/AC7114

Controls all measuring and test equipment (MTE) requiring calibration.

**Key concepts:**
- Equipment records include calibration frequency, last calibration date, next due date
- Status: CALIBRATED / OVERDUE / OUT_OF_SERVICE
- System flags equipment overdue (RED) and due within 30 days (AMBER)
- Out-of-tolerance (OOT) withdrawal workflow: equipment flagged OOT is withdrawn from service and all work done since last calibration is reviewed

**Key workflow — Recording a Calibration:**
1. Find equipment → Record Calibration
2. Enter calibration date, performed by, certificate number, result (PASS / FAIL / OOT)
3. If OOT: system triggers OOT withdrawal workflow — engineer must review affected work
4. Next due date auto-calculated from frequency

**Who uses it:** Engineer (calibrates, records), QA Manager (OOT decisions)

---

### MOD-06 — Chemical / Bath Control
**Compliance:** NADCAP AC7108/AC7110, AS9100D §8.5.1

Monitors chemical bath concentrations, temperatures, and contamination levels in real time.

**Key concepts:**
- Each bath has defined parameter ranges (concentration, pH, temperature, contamination)
- RAG status: OUT_OF_SPEC (RED), DUE_SOON sample (AMBER), IN_SPEC (GREEN)
- Samples are recorded at defined frequencies; out-of-spec baths are locked from use
- Titration and Hull Cell test results are recorded per sample

**Key workflow — Recording a Bath Sample:**
1. Bath Control → select bath → Record Sample
2. Enter parameter values (concentration, temperature, pH, contamination levels)
3. System immediately calculates RAG status against the defined limits
4. If OUT_OF_SPEC: bath is flagged — supervisor must authorise any work until corrected
5. Corrective action (bath make-up, replenishment) is recorded via MOD-34

**Who uses it:** NDT Inspector (samples), Supervisor (authorise out-of-spec use)

---

### MOD-19 — Extended Laboratory
**Compliance:** AS9100D §8.5.1, NADCAP AC7108

Manages laboratory tests that extend beyond standard bath sampling — Hull Cell, salt spray, tensile, and other material tests.

**Key workflow:** Log test → record results and method → attach test report → link to batch/job

**Who uses it:** Engineer (laboratory tests)

---

## 7. Operations

### MOD-09 — Sales & Customer Service
**Compliance:** AS9100D §8.2, §8.4

Manages the entire sales pipeline from customer enquiry through contract review to delivery.

**Tabs:**
- **Customers** — customer database with contact details and customer-specific requirements
- **Parts** — part library per customer (part number, material, process)
- **Quotations** — generate and track quotations (QT- numbered)
- **Contract Reviews** — formal AS9100D §8.2.3 contract review records
- **GRN** — Goods Received Notes (incoming jobs from customers)
- **Delivery Orders** — outgoing completed job delivery records

**Key workflow — New Job Intake:**
1. Customer drops off parts → raise a GRN (Goods Received Note)
2. GRN records: customer, parts, quantity, condition at receipt, required process
3. Contract Review is triggered — engineer confirms process capability and requirements
4. GRN is linked to a Work Order (MOD-13) for processing

**Who uses it:** Customer Service (GRN, quotations), Engineer (contract review), QA Manager (approve)

---

### MOD-10 — Production Management
**Compliance:** AS9100D §8.1, §8.5

Tracks production jobs through the facility, monitors WIP (work in progress), and manages throughput.

**Key views:**
- Production register — all active jobs with status
- Process queue — jobs awaiting each process step
- WIP summary — jobs by stage and bay
- Defect tracking — scrap and rework rates

**Who uses it:** Supervisor (daily production), Engineer (production planning)

---

### MOD-13 — Work Order / Traveler
**Compliance:** AS9100D §8.5.1

The central job control document. Every job processed through the facility has a Work Order (WO-) that acts as its traveler.

**Key concepts:**
- WO- auto-numbered
- Each work order has defined process steps (e.g., Pre-clean → FPI → Post-clean → Inspection)
- Steps are signed off sequentially with operator name and timestamp
- Special process steps (FPI, MPT) require qualified operator sign-off
- Work order links to: customer, part, GRN, CoC, and all process records

**Key workflow — Processing a Job:**
1. Work Order is created (from GRN or production planning)
2. Job Traveler modal — shows all steps with sign-off fields
3. Each step: operator signs off (name + optional PIN for restricted steps)
4. When all steps complete: work order status → COMPLETE
5. QA review is triggered → CoC can be issued (MOD-24)

**Who uses it:** NDT Inspector (step sign-offs), Supervisor (job control), QA Manager (final review)

---

### MOD-24 — Certificate of Conformance
**Compliance:** AS9100D §8.5.1, §8.6, NADCAP AC7108/AC7114

Issues certificates confirming that work performed meets all specified requirements.

**CoC status flow:** `DRAFT → ISSUED → VOID`

**Key workflow — Issuing a CoC:**
1. CoC list → New CoC — select the completed Work Order
2. System auto-populates: customer, part, process performed, specifications, inspector
3. QA Manager reviews and clicks **Approve & Issue** — status becomes ISSUED
4. CoC number (COC-YYYYMMDD-NNNN) is locked; document is printable
5. To void: QA Manager enters void reason; original is retained for audit trail
6. **Re-issue:** voids original and creates a new DRAFT — requires full re-approval

**Who uses it:** QA Manager (issues, voids), Engineer (creates draft)

---

### MOD-11 — Maintenance Management
**Compliance:** AS9100D §7.1.3 · NADCAP (equipment traceability)

Full equipment maintenance management — asset register, preventive maintenance scheduling, PM checklists, maintenance records history, breakdown logging, and work permits.

**Tabs:**
- **Asset Register** — all equipment with next PM due date, last PM date, and RAG status; Log Breakdown button per asset
- **PM Schedule** — due/overdue schedule per asset with RAG; "Complete PM" opens a detailed completion modal
- **Maintenance Records** — full history of all PM completions, repairs, inspections with technician, parts used, findings, and outcome
- **Breakdown Log** — log equipment failures with failure mode, root cause, resolution, and downtime hours; unresolved breakdowns shown in red
- **PM Checklists** — create and manage PM checklist templates; templates auto-load into the PM completion modal
- **Work Permits** — hazardous activity permits (electrical, confined space, hot work, etc.)

#### Key Concepts

**PM Completion Modal (AS9100D §7.1.3)**
- Clicking "Complete PM" opens a structured modal — not a one-click action
- Required fields: Technician (from HR register), Findings, Outcome (PASS / DEFERRED / FAIL)
- **PM Checklist** — if a checklist template exists for the selected asset (or a generic template), it auto-loads in the modal; all required items (marked with `*`) must be checked before the record can be saved
- Checklist items of type **CHECK** require only a tick; items of type **TEXT** require a tick plus a recorded value (e.g., "pH reading: 8.7")
- If the checklist has an attached Work Instruction, a **View Work Instruction** button appears at the top of the checklist section — click to open the document in a new tab
- **Photos / Evidence** section at the bottom — upload one or more photos (e.g., before/after condition shots, evidence of findings); all photos are stored to MOD-37 File Repository linked to the maintenance record
- Parts / Spare Parts Used — select parts from MOD-14 Inventory; consumed parts are automatically issued from stock
- Corrective actions recorded for any findings

**PM Checklists (AS9100D §7.1.3 / AS9100D §7.5 — controlled form templates)**
- Every PM checklist template is a **controlled form** — assigned a system-wide Form ID (`FM-001`, `FM-002`…) on first save
- Form revisions are version-tracked (`v1`, `v2`…); editing an approved form creates a new revision starting at DRAFT
- **Approval workflow** — new and revised checklists must be approved by the QA Manager before they can be used:
  1. Create/edit checklist → saved as **DRAFT**
  2. Click **Submit** → status changes to **AWAITING QM** and an approval request appears in the QM's User Dashboard
  3. QM approves or rejects with a reason; rejected forms return to **DRAFT** for revision
  4. Only **APPROVED** checklists auto-load in the PM Completion modal
- Templates are asset-specific or generic (applies to any asset with no matching specific template)
- Each template has a name, list of items, and an optional **Work Instruction (WI)** document attachment
- Items can be CHECK-only or TEXT (value required); Required items (marked `*`) block save until checked
- **Work Instruction attachment** — upload a PDF, Word, or image to a template; a "WI" badge appears on the card; a **View Work Instruction** button appears in the PM modal for the technician to reference
- Delete a template with the **Delete** button — locked (cannot delete while AWAITING QM)
- Templates seeded by default (pre-approved): FM-001 *FPI Tank — Weekly PM*, FM-002 *UV Light Station — Monthly PM*, FM-003 *Air Compressor — Quarterly PM* (generic)

**Photo Storage (MOD-37 File Repository)**
- Per-item photos are stored immediately on attachment (before saving the PM record) so they receive a File ID
- General PM photos are stored at save time, linked to the generated maintenance record ID
- All stored photos are accessible in MOD-37 File Repository under module `MOD-11`, entity type `PM_ITEM_PHOTO` or `MAINTENANCE_RECORD`

**Breakdown Log**
- Any equipment failure must be logged immediately (AS9100D §7.1.3 — infrastructure failure traceability)
- Fields: Asset, Failure Mode (Mechanical / Electrical / Chemical / Software / Operator Error / Wear / External), Description, Root Cause, Resolution, Downtime hours
- Status: Reported → Resolved; unresolved breakdowns are highlighted in red with a Resolve button
- The "Active Breakdowns" KPI card counts open (unresolved) breakdowns

**Parts Traceability (MOD-14 link)**
- Spare parts used during maintenance are selected from MOD-14 Inventory
- Consumed quantities are automatically issued from stock, maintaining full traceability

**Maintenance Records (audit evidence)**
- Every PM completion, inspection, and repair is stored with date, technician, duration, parts used, findings, checklist results, and outcome
- Filterable by type (PM / Repair / Inspection) and outcome (PASS / FAIL / DEFERRED)
- These records serve as objective evidence for AS9100D §7.1.3 and NADCAP audits

#### Workflows

**Recording a PM Completion**
1. Go to **PM Schedule** tab
2. Click **Complete PM** next to the due schedule
3. Select technician, enter findings, add any spare parts used, select outcome
4. Complete the auto-loaded checklist — check each item; enter values for TEXT items; attach per-item photos if needed
5. Optionally upload general condition photos in the Photo Upload section
6. Click **Save Record** — checklist validates all required items; schedule advances; record and photos stored

**Managing PM Checklists**
1. Go to **PM Checklists** tab → **New Checklist**
2. Set name, link to a specific asset or leave generic
3. Optionally attach a Work Instruction document (PDF, Word, image)
4. Add checklist items — choose type (CHECK / TEXT) and mark Required where mandatory
5. Click **Save Checklist** — form is saved as **DRAFT** with auto-assigned Form ID
6. Click **Submit** on the card → request sent to QM's User Dashboard for approval
7. QM approves or rejects; once **APPROVED**, the checklist auto-loads in PM completion for the linked asset
8. To revise an approved form: click **Edit** → increments to new revision, returns to DRAFT → resubmit for QM approval

**Logging a Breakdown**
1. Click **Log Breakdown** in the Breakdown Log tab (or the ⚠ button in Asset Register)
2. Select asset, failure mode, enter description and downtime hours
3. Save — status is REPORTED; breakdown appears in red
4. Once repaired: click **Resolve** → enter root cause and resolution → status becomes RESOLVED

**Who uses it:** Supervisor (complete PM, log breakdowns), Engineer (review records, work permits, manage checklists), QA Manager (audit evidence review)

---

### MOD-12 — Purchasing & AVL
**Compliance:** AS9100D §8.4

Manages suppliers, the Approved Vendor List (AVL), and purchase orders.

**Key concepts:**
- **AVL** — only APPROVED suppliers may supply controlled materials/services
- New suppliers start as PENDING, go through evaluation → APPROVED or REJECTED
- Purchase Orders (PO-) are raised against approved suppliers only
- PO is linked to inventory receipts (MOD-14) for stock update

**Key workflow — Approving a New Supplier:**
1. Add supplier → status PENDING
2. Engineer completes supplier evaluation (quality record, certifications)
3. QA Manager approves → status APPROVED → supplier appears in AVL dropdown
4. Rejected suppliers are flagged and cannot be selected for new POs

**Who uses it:** Engineer (POs, supplier evaluation), QA Manager (AVL approval)

---

### MOD-14 — Inventory Management
**Compliance:** AS9100D §8.4.3 · AS9100D §8.5.4 · NADCAP (chemical process materials)

Controls all stock — chemicals, consumables, PPE, spare parts, tools, and materials. Fully compliant with AS9100D incoming inspection and shelf-life requirements and NADCAP chemical certification traceability.

**Tabs:**
- **Inventory Register** — full stock list with RAG status, bin location, lot expiry, quarantine count KPI
- **Stock Movements** — all receipts, issues, transfers, disposals, and adjustments
- **Incoming Inspection** — compliance gate: received lots await inspection before release (AS9100D §8.4.3)
- **Lot Expiry** — all received lots with expiry tracking, FEFO order indicator; extend or scrap actions
- **Locations** — storage location registry with bin number management
- **Units** — unit of measure registry

#### Key Concepts

**Quarantine Workflow (AS9100D §8.4.3 / NADCAP)**
- All stock received via RECEIPT lands in **QUARANTINE** status automatically
- Quarantined lots are highlighted in amber and cannot be selected for ISSUE
- An NDT Inspector or Supervisor must open the **Incoming Inspection tab** and record a PASS result to release the lot to **AVAILABLE** status
- A FAIL result marks the lot **REJECTED** and requires an NCR to be raised in MOD-07
- The KPI card **Quarantined Lots** shows how many lots are pending inspection at a glance

**FEFO — First Expired, First Out (AS9100D §8.5.4)**
- When issuing stock, the lot dropdown is sorted by expiry date (soonest first)
- The lot expiring soonest is marked **"USE FIRST (FEFO)"** to enforce shelf-life rotation
- Only AVAILABLE (inspected) lots appear in the ISSUE dropdown

**Material Certificates (NADCAP)**
- When receiving a lot, enter the **Material Cert / Heat No.** and **Cert Expiry** date
- These fields are stored with the lot record and visible in the Incoming Inspection tab
- Auditors can verify certification traceability for any received lot

**MSDS/SDS Enforcement (NADCAP chemical compliance)**
- When issuing a hazardous item, the system checks MSDS/SDS currency
- If no MSDS is on file, or the MSDS has expired, a red warning banner appears and must be resolved before issuing

**Storage Locations & Bin Numbers**
- Each storage location (e.g., "Chemical Store") has its own registry of bin numbers (e.g., CS-A1, CS-A2)
- Items are assigned to a specific location AND a specific bin within that location
- To manage bins for a location: go to the **Locations tab** → click **Manage** next to the location → add or remove bins in the popup
- When editing an item, selecting a location auto-populates the **Bin No.** dropdown with that location's available bins

**Hazardous Material Enforcement**
- Items marked as **Hazardous** must be stored in a `HAZMAT` location
- Items marked as **Explosive Precursor** must be stored in an `EXPLOSIVE` location
- The system blocks saving to an incompatible location type

**RAG Stock Status**
- 🔴 RED — out of stock or at/below critical level
- 🟡 AMBER — below reorder level
- 🟢 GREEN — adequate stock

#### Workflows

**Receiving Stock (RECEIPT)**
1. Stock Movements → Record Movement → type: RECEIPT
2. Select item, enter quantity, lot number, delivery order number, expiry date
3. Optionally enter Material Cert / Heat No. and Cert Expiry date (required for NADCAP traceability)
4. Optionally upload a Certificate of Conformance (COC) for the lot
5. Submit for approval → Supervisor approves → lot is created in **QUARANTINE** status

**Incoming Inspection (AS9100D §8.4.3)**
1. Open the **Incoming Inspection tab** — quarantined lots appear with amber highlighting
2. Click **Inspect** next to the lot
3. Select PASS or FAIL, add inspection notes
4. If FAIL: enter the NCR reference (raise in MOD-07 first)
5. Click **Record Inspection** → lot changes to AVAILABLE (PASS) or REJECTED (FAIL)

**Issuing Stock (ISSUE)**
1. Stock Movements → Record Movement → type: ISSUE
2. Select item — only **AVAILABLE** (inspected-passed) lots appear in the lot dropdown
3. Lot dropdown is sorted FEFO (soonest expiry first); the first entry is marked "USE FIRST"
4. If the item is hazardous and MSDS has expired or is missing, a warning banner blocks the action
5. Enter issue destination and issued-to person; submit → Supervisor approves

**Lot Expiry Management**
- The **Lot Expiry tab** shows all received lots sorted by expiry date with availability status
- **Extend** — submit an extension request with evidence document → QA Manager approves → expiry date updated
- **Scrap** — submit disposal with disposal method (wastewater / general waste / vendor) → Supervisor approves → lot removed from active stock

**Transferring Between Locations**
1. Record Movement → type: TRANSFER
2. Current location shown automatically; select the target location
3. Optionally specify which lot to transfer

**Who uses it:** NDT Inspector (receipts, incoming inspection, issues), Supervisor (approves movements), QA Manager (lot extensions, MSDS updates)

---

## 8. Business & HR

### MOD-16 — Finance
**Compliance:** AS9100D §6.1

Manages financial records, job costing, invoicing, and budget tracking.

**Key functions:** Invoice register, job cost allocation, expense recording, P&L summary

**Who uses it:** Finance staff, Management

---

### MOD-18 — HR Management
**Compliance:** AS9100D §7.2

Maintains employee records and competency tracking.

**Key data tracked:** Employment details, qualifications, training records, competency matrix, emergency contacts

**Who uses it:** HR staff, QA Manager (competency sign-offs)

---

### MOD-21 — Communications
**Compliance:** AS9100D §7.4

Records and tracks all formal internal and external communications — memoranda, bulletins, customer notices.

**Key workflow:** Create communication → assign recipients → track acknowledgement

**Who uses it:** Management, QA Manager

---

### MOD-22 — Leave & Attendance
**Compliance:** MOM (Ministry of Manpower) compliance

Manages employee leave applications, approvals, and attendance records.

**Leave types:** Annual Leave, Medical Leave, Emergency Leave, Unpaid Leave, Public Holiday

**Key workflow — Leave Application:**
1. Employee applies → selects type, dates, and reason
2. Supervisor approves or rejects
3. Leave balance is automatically updated
4. Calendar view shows team availability

**Who uses it:** All staff (apply), Supervisor (approve), HR (administer)

---

### MOD-23 — Payroll
**Compliance:** MOM / CPF

Processes monthly payroll, CPF contributions, and generates payslips.

**Key workflow:** Run payroll → review → approve → generate payslips

**Who uses it:** HR/Finance staff, ADMIN

---

## 9. Process Control

### MOD-30 — Pyrometry & Heat-Treat
**Compliance:** NADCAP AC7102, AMS 2750H

Manages heat treatment ovens, pyrometry tests (TUS/SAT), and thermocouple records.

**Key concepts:**
- **TUS** (Temperature Uniformity Survey) — verifies oven temperature uniformity across the work zone
- **SAT** (System Accuracy Test) — verifies the accuracy of temperature measurement instruments
- Ovens are flagged OVERDUE when TUS/SAT is due; aerospace-only routing gates require CURRENT status

**Key workflow — Recording a TUS:**
1. Pyrometry → select oven → New TUS Record
2. Enter test date, technician, thermocouple positions, and results at each point
3. System checks all readings against AMS 2750H uniformity limits
4. If PASS: oven status updated to CURRENT; next due date calculated
5. If FAIL: oven is locked from aerospace use until corrective action

**Who uses it:** Engineer (pyrometry), QA Manager (sign-off), ADMIN (oven configuration)

---

### MOD-31 — Operator Competency & PIN Sign-off
**Compliance:** NAS410 §4, AS9100D §7.2

Enforces that only competent, qualified operators perform restricted process steps.

**Key concepts:**
- Each operator has a competency matrix: process × customer × bay × qualification level
- Restricted steps (e.g., FPI disposition, chemical bath approval) require a **PIN sign-off** — the operator enters a 4-digit PIN that acts as an electronic signature
- PIN sign-off is non-repudiable and audit-logged with timestamp and IP

**Key workflow — PIN Sign-off:**
1. At a restricted step, a PIN entry dialog appears
2. Operator enters their 4-digit PIN
3. System verifies: (a) PIN matches, (b) operator holds the required competency for this process/customer/bay
4. If verified: step is signed with operator name, timestamp, and competency record reference
5. If not verified: step is blocked; a supervisor override or competency assignment is required

**Who uses it:** NDT Inspector (sign-off), QA Manager (competency assignment, PIN setup)

---

### MOD-32 — Bay Load Scheduler & Tank-Fit
**Compliance:** AS9100D §8.1

Schedules work across processing bays and validates that parts physically fit the chemical tanks.

**Tabs:**
- **Bay Schedule** — drag-and-drop slot cards across bay lines and shifts
- **Tank-Fit Check** — validates part L×W×D against the tank dimensions before scheduling
- **Bay Load** — shows current utilisation across all bays

**Key workflow — Scheduling a Job:**
1. Bay Schedule → create a new slot → select job, bay line, and shift
2. Run Tank-Fit Check — enter part dimensions; system checks against the selected tank's max L/W/D
3. If OVERSIZE: slot is flagged; job cannot proceed until a suitable tank is found
4. Once scheduled: bay line shows the job on the shift card

**Who uses it:** Supervisor (scheduling), Engineer (tank-fit verification)

---

### MOD-33 — Spec & Flowdown / Frozen Process + ECN
**Compliance:** NADCAP Frozen Process Control, AS9100D §8.1, §8.5.6

Controls process specifications, customer flowdown requirements, and manages Engineering Change Notices.

**Key concepts:**
- **Frozen Process** — once a spec is frozen, no changes can be made without raising an ECN
- **ECN (Engineering Change Notice)** — formal change control document with customer approval workflow
- **AAM (Authority Approval Matrix)** — defines who can approve changes at each level
- **Process Recipes** — step-by-step process parameters linked to a spec

**ECN Status Flow:**
`DRAFT → PENDING_REVIEW → PENDING_CUSTOMER → CUSTOMER_APPROVED → APPROVED → IMPLEMENTED`

**Key workflow — Changing a Frozen Process:**
1. Engineer attempts to edit a frozen spec → system blocks and requires an ECN
2. New ECN → describe the change, attach technical justification
3. QA Manager reviews → status: PENDING_CUSTOMER (if customer approval needed)
4. Customer approves → CUSTOMER_APPROVED → QA Manager formally approves → APPROVED
5. Process spec is updated → ECN: IMPLEMENTED

**Who uses it:** Engineer (specs, ECN draft), QA Manager (ECN approval), Customer (external approval step)

---

### MOD-34 — Chemical & Hazmat Control + Alert Escalation Engine
**Compliance:** NADCAP AC7108/AC7110, WSH/SDS, REACH/RoHS, AS9100D §9.1

Comprehensive chemical management system including SDS control, bath make-up, replenishment, and a cross-module alert escalation engine.

**Tabs:**
- **SDS Register** — Safety Data Sheet library for all chemicals; expiry tracking; controlled-substance flags for cyanide/cadmium
- **Bath Make-up** — step-by-step calculator for preparing a bath from scratch with ordered addition steps and CONTROLLED substance warnings
- **Chemical Inventory** — stock levels of chemical raw materials
- **Escalation** — cross-module alert rules: 10 rules covering MOD-06/07/30/31/33/34/05 with CRITICAL/ALERT/WARNING severity and acknowledge workflow

**Key workflow — Bath Make-up:**
1. Bath Make-up → select bath type → system shows the formula
2. Ordered addition steps are listed (critical for safety — never add acid to water)
3. If a CONTROLLED substance (cyanide, cadmium) is included: a red warning banner appears
4. Record who performed the make-up → log is saved

**Alert Escalation:**
The Escalation Engine monitors conditions across 10+ modules. When a threshold is breached (e.g., bath OOS + no sample for 48h, calibration overdue for >7 days), the system escalates through ALERT levels:
- WARNING → email-equivalent notification
- ALERT → supervisor notified
- CRITICAL → QA Manager must acknowledge

**Who uses it:** Engineer (SDS, bath make-up), Supervisor (inventory, escalation acknowledgement), QA Manager (CRITICAL escalations)

---

### MOD-35 — Government & Regulatory Certification Renewal
**Compliance:** AS9100D §7.1.2, NADCAP AC7102/AC7108/AC7114, MOM WSH Act, CAAS AMO

Tracks all regulatory body accreditations, approvals, licenses, and certifications with renewal workflows.

**Key concepts:**
- Body types: NADCAP, CUSTOMER, GOVERNMENT, ISO_BODY, INDUSTRY
- Cert types: ACCREDITATION, APPROVAL, LICENSE, PERMIT, QUALIFICATION, REGISTRATION
- Each cert has a configurable `renewal_lead_days` — how many days before expiry to start the renewal process
- RAG: OVERDUE (expired), DUE_SOON (within lead days), OK

**Renewal Action Flow:** `INITIATE → SUBMIT_APPLICATION → AUDIT_SCHEDULED → AUDIT_COMPLETE → CERT_RECEIVED`

**Key workflow — Renewing a Certification:**
1. System flags cert as DUE_SOON → creates a renewal action at INITIATE
2. Engineer initiates: submits application → status: SUBMIT_APPLICATION
3. Body schedules audit → AUDIT_SCHEDULED (record date)
4. Audit conducted → AUDIT_COMPLETE (record outcome)
5. Cert received and scanned → CERT_RECEIVED → cert expiry updated in register

**Who uses it:** QA Manager (cert register), Engineer (renewal actions), Supervisor (renewal actions)

---

### MOD-36 — Equipment Periodic Preventive Maintenance
**Compliance:** AS9100D §7.1.3, AMS 2750H, NADCAP AC7108

Manages PPM schedules and maintenance logs for all facility equipment assets.

**Key concepts:**
- Asset categories: OVEN, TANK, NDT_EQUIPMENT, ELECTRICAL, HVAC, INSTRUMENT, COMPRESSOR, PUMP, RECTIFIER, OTHER
- PM frequencies: DAILY, WEEKLY, MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL
- System calculates `next_due_date` automatically after each log entry
- Cross-reference with MOD-30: heat treatment ovens are linked to their oven records
- RAG: OVERDUE (past due date), DUE_SOON (within 7 days), OK

**Key workflow — Logging a PM:**
1. PM Schedule tab → find the schedule → Log PM
2. Select the checklist items completed, record technician and findings
3. System advances `next_due_date` based on frequency (e.g., MONTHLY adds 1 month)
4. If a defect is found: raise a corrective maintenance record

**Who uses it:** Supervisor (logs PM), Engineer (manages schedules), QA Manager (reviews overdue)

---

## 10. Capability & Analytics

### MOD-28 — Process Capability Master (PCM)
**Compliance:** AS9100D §8.1, NADCAP

Defines and maintains the company's process capability declarations — what processes can be performed, to which specifications, for which customers.

**Key data:** Process type, specification, equipment required, personnel qualification required, customer approvals held

**Who uses it:** QA Manager (capability declarations), Engineer (reads)

---

### MOD-29 — Customer Qualification
**Compliance:** AS9100D §8.4, NADCAP customer requirements

Tracks the qualification status of the company for each customer — what processes are approved, which are pending, and renewal timelines.

**Key workflow:** Receive customer audit → record results → update qualification status → track renewal

**Who uses it:** QA Manager, Business Development

---

### MOD-15 — KPI Dashboard
**Compliance:** AS9100D §9.1, §9.3

A real-time management dashboard that composes alert data from all modules into a single compliance health view.

**Key views:**
- **Compliance Health Ring** — overall system health as a percentage of green alerts
- **Domain Roll-ups** — health by domain (Quality, NDT, Operations, etc.)
- **Attention List** — prioritised list of items needing immediate action
- **Status Matrix** — all module alert summaries in a grid

**Who uses it:** Management (daily review), QA Manager (monitoring)

---

### MOD-27 — Value Flow Tracker
**Compliance:** AS9100D §8.5

An interactive 8-stage pipeline diagram showing a job's live position through the production flow.

**8 stages:**
1. PO / Contract Review
2. GRN (Goods Receipt)
3. Work Order
4. Production
5. NDT (FPI / MPT)
6. QA Sign-off
7. Certificate of Conformance
8. Delivery

**How to use:**
1. Enter a GRN reference in the search box → system resolves the job's current stage
2. Each stage node is coloured: pending / active / waiting / complete / blocked
3. Open NCRs on a job show a "blocked" indicator
4. Click any stage node to jump directly to that module

**Who uses it:** All staff (job tracking), Management (pipeline visibility)

---

### My Dashboard
A personalised view showing:
- Your pending approvals (stock movements, lot extensions, lot disposals)
- Your assigned tasks and upcoming due dates
- Your certifications and competencies expiring soon
- Recent activity on jobs you are assigned to

**Key function — Approving Items:**
1. My Dashboard → Pending Approvals
2. Review each item (movement details, lot expiry request, disposal)
3. Click **Approve** or **Reject** with a note
4. Approved items take effect immediately (stock is updated, expiry is extended, etc.)

---

## 11. System

### MOD-25 — User Management
**Compliance:** AS9100D §7.2, cybersecurity policy

Manages user accounts, roles, and access control.

**Key functions:**
- Create, edit, and deactivate user accounts
- Assign roles (READONLY through ADMIN)
- Reset passwords
- View login history and active sessions

**Who uses it:** ADMIN only

---

### MOD-37 — File Repository
**Compliance:** AS9100D §7.5

A central document store that consolidates files uploaded by any module. Acts as the system-wide document library.

**Key concepts:**
- Every file uploaded via another module (MSDS, CoC, evidence, calibration cert) is stored here and retrievable from here
- File tags: COC, EVIDENCE, MSDS/SDS, CALIBRATION, AUDIT, PERMIT, TRAINING, DOCUMENT
- Files are linked to the source module and entity (e.g., MOD-05, equipment ID EQ-0012)

**Tabs:**
- **File Browser** — search and filter all files by module, tag, and keyword; open any file
- **Upload File** — manually upload a file and link it to any module/entity
- **Storage Overview** — by-module and by-tag breakdown with progress bars; recent uploads list

**Key workflow — Finding a File:**
1. File Browser → use the search box to search by filename, module, or linked entity
2. Filter by Module (e.g., MOD-35) or Tag (e.g., CALIBRATION)
3. Click **Open** to view the file in a new tab

**How other modules use the File Repository:**
- Modules upload files via `ATCA.fileStore.put(metadata, dataUrl)` — they receive a `FILE-NNNN` ID
- Files can be retrieved by any module using that ID
- The File Repository page provides a centralised view of everything stored

**Who uses it:** All staff (browse, open), Engineer and above (upload)

---

### Internal Chat
A WhatsApp-style internal messaging system for team communication within the LAN.

**Key features:**
- Real-time polling for new messages (no internet required)
- Messages are tagged by sender and timestamp
- No external data leaves the LAN

**Who uses it:** All staff

---

### MOD-26 — Maintenance Console
**Access:** ADMIN only

System administration and maintenance tools.

**Tabs:**
- **Storage** — localStorage usage by module; clear module data (with confirmation)
- **Activity Logs** — full audit log of all user actions across the system
- **Users** — quick user admin view
- **Password Control** — force-reset any user's password
- **Backup** — download a full data backup; restore from backup
- **Maintenance Mode** — toggles system into maintenance mode, locking out all non-ADMIN users

**Who uses it:** ADMIN only

---

### Change Log
A chronological record of all system changes, feature additions, and bug fixes to the ATCA-ERP software.

Entries are added by the development team with each deployment.

---

### Bug Report
Allows any user to submit a bug report or feature request directly from within the application.

**Workflow:** Describe the issue → attach a screenshot if needed → submit → development team reviews

---

## 12. Cross-Module Workflows

### Complete Job Processing (End-to-End)
```
Customer Enquiry (MOD-09) 
  → Quotation & Contract Review (MOD-09)
  → Goods Receipt / GRN (MOD-09)
  → Work Order Created (MOD-13)
  → Stock Issued from Inventory (MOD-14)
  → Bay Scheduled (MOD-32)
  → Operator Qualified? Check (MOD-31)
  → Bath Control Checked (MOD-06)
  → FPI Process (MOD-03) or MPT Process (MOD-17)
  → NCR if Rejected (MOD-07)
  → QA Sign-off (MOD-13)
  → Certificate of Conformance Issued (MOD-24)
  → Value Flow shows COMPLETE (MOD-27)
  → Delivery Order (MOD-09)
```

### Non-Conformance Workflow
```
NCR Raised (MOD-07) 
  → Complaint Linked if Customer-Raised (MOD-20)
  → CAPA Opened (MOD-07)
  → Root Cause Analysis
  → Corrective Action Implemented
  → QA Manager Verifies
  → NCR + CAPA Closed
```

### Calibration OOT (Out-of-Tolerance) Workflow
```
OOT Result Recorded (MOD-05)
  → Equipment Withdrawn from Service
  → All Work Since Last Cal Reviewed
  → NCR Raised for Affected Work (MOD-07)
  → Equipment Recalibrated or Replaced
  → OOT Record Cleared
  → Work Review Documented
```

### Lot Expiry Workflow
```
RECEIPT Approved (MOD-14 / My Dashboard)
  → Lot Tracked with Expiry Date
  → System Flags Lots Expiring ≤30 Days
  → Option 1: Extend — evidence uploaded → Approved → Expiry Updated
  → Option 2: Scrap — disposal method recorded → Approved → Stock Reduced
```

---

## 13. Approval Queue

Many actions in ATCA-ERP require a second-level approval before they take effect. This prevents unilateral changes to controlled data.

**Items that require approval:**

| Action | Submitted by | Approved by |
|---|---|---|
| Stock RECEIPT | NDT Inspector | Supervisor |
| Stock ISSUE | NDT Inspector | Supervisor |
| Stock TRANSFER | NDT Inspector | Supervisor |
| Stock DISPOSAL | Supervisor | QA Manager |
| Stock ADJUSTMENT | Supervisor | QA Manager |
| Lot Expiry Extension | Supervisor | QA Manager |
| Lot Scrap Disposal | Supervisor | QA Manager |

**How approvals work:**
1. Submitter fills in the details → clicks **Submit for Approval**
2. Record appears in the approver's **My Dashboard → Pending Approvals**
3. Approver reviews → clicks **Approve** or **Reject** (with reason)
4. Effect is applied immediately on approval (stock updated, expiry changed, etc.)
5. All approval decisions are audit-logged with approver name, timestamp, and LAN IP

---

## 14. File Repository Integration

The `ATCA.fileStore` service is available to every module. Files uploaded by any module are automatically visible in MOD-37 File Repository.

**File tags and their source modules:**

| Tag | Description | Typical Source |
|---|---|---|
| `COC` | Certificate of Conformance | MOD-24, MOD-14 (lot receipts) |
| `EVIDENCE` | Audit/inspection evidence | MOD-08, MOD-14 (lot extensions) |
| `MSDS` | Material Safety Data Sheet | MOD-14, MOD-34 |
| `CALIBRATION` | Calibration certificate | MOD-05 |
| `AUDIT` | Audit finding evidence | MOD-08 |
| `PERMIT` | Regulatory permit | MOD-35 |
| `TRAINING` | Training record / certificate | MOD-04, MOD-31 |
| `DOCUMENT` | General controlled document | MOD-02, MOD-33 |
| `PM_PHOTO` | Preventive maintenance condition photos | MOD-11 (per-item and general PM photos) |

**Opening a file from any module:**
- Each file-linked record has an **Open** button
- Clicking it retrieves the file from the File Repository and opens it in a new browser tab
- Files are stored as base64 data URLs in localStorage for the demo/preview environment

---

## 15. Document Governance & Revision Control

ATCA-ERP enforces three system-wide governance rules on all controlled data. These rules apply to every module and every record type. They are defined in full in `DEVELOPMENT-STANDARDS.md`.

### Rule 1 — Audit Log on Every Change

Every create, update, delete, approval, or rejection is automatically recorded in the system audit log. Each entry captures:

- **Who** changed it (user name and ID)
- **From which terminal** (LAN IP address)
- **What changed** (old value → new value, stored as JSON snapshots)
- **When** (UTC timestamp)
- **Which module and record** (module ID, table, record ID)

Audit log entries are append-only and cannot be deleted. The full audit trail is accessible to ADMIN users via **MOD-26 System Maintenance Console → Activity Logs**.

### Rule 2 — Form Numbers (FM-NNN) on All Controlled Forms

Every controlled form created in the system is assigned a permanent, unique Form Number on first save:

```
FM-001   FM-042   FM-137   …
```

The number is assigned by a global auto-increment sequence. It never changes and is never re-used, even if the form is later rejected or deprecated. It is displayed as a badge on every form list and detail view.

**What is a controlled form?** Any record that:
- Is completed by a user to record a process, decision, or inspection result
- Goes through a review or approval workflow
- Must be traceable for NADCAP / AS9100D audit

Examples: PM Checklists (MOD-11), NCR reports (MOD-07), CAPA records (MOD-07), Job Travelers (MOD-13), CoC documents (MOD-24).

### Rule 3 — Persistent Revision History on Every Document

Every controlled document maintains a full revision history. Each document shows:

| Badge | Meaning |
|---|---|
| `FM-042` | Permanent form number |
| `v3` | Current revision number |
| `APPROVED` / `DRAFT` / `PENDING QM` / `REJECTED` | Current status |

**State machine — all controlled documents follow this lifecycle:**

```
DRAFT  ──[Submit for QM approval]──►  PENDING QM
                                           │
                              ┌────────────┴────────────┐
                              ▼                         ▼
                           APPROVED               REJECTED (with reason)
                              │                        │
                  [Any edit]  │                [Edit to correct]
                              ▼                        ▼
                           DRAFT (version + 1)      DRAFT (same version)
```

Key rules:
- **PENDING QM** documents are locked — no edits and no deletes allowed.
- Any edit to an **APPROVED** document resets it to **DRAFT** and increments the version number. The prior approved version is recorded in the revision history.
- Only **QA Manager** or **Admin** can approve or reject.
- Rejections require a written reason, which is shown on the form card.

---

---

## §16 Multi-Entity Support (ATCA · ATCT · APF)

The ERP supports three legal entities operating within the ATC group. You can switch between entities at any time using the entity pill in the top-right corner of every page.

| Entity | Full Name | NADCAP Capabilities |
|---|---|---|
| **ATCA** | ATC Aviation Pte Ltd | AC7114 (NDT — PT/MT/UT/FPI) |
| **ATCT** | ATC Treatment Pte Ltd | AC7108 (Chemical Processing) |
| **APF** | Asia Pacific Finishing | AC7110 (Coatings) + AC7114 (NDT) |

### Switching Entity
1. Click the colored entity pill in the top-right corner of the topbar (e.g., **ATCA**).
2. Select the target entity from the dropdown.
3. The page will reload with the active entity updated. All subsequent actions are recorded under the new entity context.

The active entity is stored in your browser session and persists until you switch again.

### Shared Assets
Some assets (equipment, calibration references, software licenses) are shared across all three entities. These appear in the Shared Assets tab of the Inter-Company Trading module with a **ALL ENTITIES** scope badge. Any entity can view and use shared assets; the custodian entity is responsible for calibration and maintenance.

---

## §17 Inter-Company Trading (Interco PO / DO)

**Module:** Inter-Company Trading (ICO) — accessible from the System section of the Home dashboard or via the sidebar.

Inter-company orders allow the three ATCA group entities to formally trade goods and services with each other, with full traceability.

### Interco Purchase Orders (ICO-PO)
An ICO-PO is a formal order issued by one entity to another for goods or services.

**Number format:** `ICO-PO-YYYY-NNN` (e.g. `ICO-PO-2026-001`)

**Lifecycle:**
```
DRAFT → ISSUED → ACKNOWLEDGED → FULFILLED → CLOSED
```

**To raise an Interco PO:**
1. Go to Inter-Company Trading → Interco Purchase Orders tab.
2. Click **New Interco PO**.
3. Select **From Entity** (issuer) and **To Entity** (recipient). These must be different entities.
4. Fill in description, amount (SGD), PO date, and required-by date.
5. Set initial status to **DRAFT** (save and continue later) or **ISSUED** (send immediately).
6. Click **Save ICO-PO**. The record appears in the table and an audit log entry is created.

**To advance status:** Click the → button on the row, or open the detail view and click **Advance Status**.

**To create a Delivery Order against a PO:** Click the truck icon on the PO row.

### Interco Delivery Orders (ICO-DO)
An ICO-DO records the physical dispatch of goods or completion of services against an ICO-PO.

**Number format:** `ICO-DO-YYYY-NNN`

**Lifecycle:**
```
DRAFT → DISPATCHED → RECEIVED
```

**To raise an Interco DO:**
1. Go to Interco Delivery Orders tab → **New Interco DO**.
2. Optionally link to an existing open ICO-PO (pre-fills From/To/Description).
3. Enter dispatch date and confirm entities.
4. Save. Once goods are received by the destination entity, advance status to **RECEIVED**.

### Shared Assets Register
The Shared Assets tab lists equipment, tooling, software, and calibration references that are shared across all three entities.

- **Scope = ALL ENTITIES** — all three entities can use the asset.
- **Custodian** = the entity responsible for maintaining, calibrating, and scheduling downtime.
- Assets with a past **Calibration Due** date are highlighted in red.

To register a new shared asset: click **Register Shared Asset**, fill in description, type, custodian, and calibration due date.

---

*This manual is a living document. Update this file after every feature change, new module, or workflow modification.*

**Version History:**

| Date | Change |
|---|---|
| 2026-06-28 | Initial release — all 37 modules documented |
| 2026-06-28 | MOD-14: Added bin number system — each location now has a registry of bins; items assigned to specific bins; managed via pop-out Bin Manager modal |
| 2026-06-28 | Navigation: Sidebar converted to collapsible accordion sections — all modules accessible without scrolling |
| 2026-06-28 | MOD-37: File Repository module added — central document store with ATCA.fileStore API |
| 2026-06-28 | MOD-14: AS9100D §8.4.3 / NADCAP audit readiness — Quarantine workflow (all receipts quarantined until inspected), Incoming Inspection tab with PASS/FAIL recording and NCR linking, FEFO lot-selection enforcement, Material Cert / Heat No. field on receipt, MSDS expiry warning on issue |
| 2026-06-28 | MOD-11: Major update aligned to Inventory module patterns — compliance topbar subtitle, Maintenance Records tab (full PM/repair/inspection history with parts badges and findings), Breakdown Log tab (failure mode, root cause, downtime, resolve workflow), PM Completion modal (technician, findings, parts from MOD-14, outcome), Asset Register now shows Last PM date and per-row Log Breakdown button |
| 2026-06-28 | MOD-11: PM Checklists — create/delete checklist templates (asset-specific or generic); templates auto-load into PM Completion modal; required items gate save; TEXT items capture measured values; Work Instruction (WI) document attachable to each template (WI badge on card; View WI button in PM modal); general PM photo upload stored to MOD-37 File Repository |
| 2026-06-28 | MOD-11 + User Dashboard: Controlled Form approval workflow — every PM checklist template is assigned a Form ID (FM-001…); new/revised checklists saved as DRAFT; Submit button sends to QM's approval queue; QM approves/rejects with reason; only APPROVED checklists activate in PM Completion modal; form version increments on edit of approved form |
| 2026-06-28 | MOD-12: AVL tab — Purchased Items button shows full list of items sourced from ATCA inventory (with HAZMAT badge and RAG stock status); Request Audit button per supplier opens a supplier audit form with training-qualified Lead Auditor dropdown (personnel must hold the relevant AS9100D/NADCAP training credential from MOD-18 Talent Management) |
| 2026-06-28 | User Guide: background colour changed to white |
| 2026-06-29 | DEVELOPMENT-STANDARDS.md created — three mandatory governance rules baked in: (1) audit log on every user input/change, (2) FM-NNN form number on every controlled form, (3) persistent revision history with DRAFT→PENDING_QM→APPROVED state machine on every document; USER-MANUAL §15 added to document these rules for end users |
| 2026-06-29 | Multi-entity support added — ATCA / ATCT / APF entity switcher pill in every page topbar; active entity stored in browser session; entity color-coded badges throughout |
| 2026-06-29 | Inter-Company Trading module (ICO) — Interco PO (ICO-PO-YYYY-NNN), Interco DO (ICO-DO-YYYY-NNN), Shared Assets register; full lifecycle status advancement; ICO card added to Home System section and sidebar; USER-MANUAL §16–17 added |
| 2026-06-29 | MOD-08 Audit Management — Calendar view tab added (month grid with audit pills by type: INTERNAL/NADCAP/CUSTOMER/SUPPLIER); audit nomination sends dashboard notification to nominated Lead Auditor; Notifications tab added to My Dashboard |
| 2026-06-29 | My Dashboard — pinned as first item in every sidebar with live pending+notification badge; My Dashboard widget added to Home page |
