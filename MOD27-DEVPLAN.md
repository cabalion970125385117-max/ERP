# MOD-27 — Value Flow Tracker: Development Plan
**ATCA-ERP v1.0 | ATC Aviation Pte Ltd**
**Authored:** 2026-06-16 | **Status:** ✅ BUILT 2026-06-16 (preview-verified)

> **Build note (2026-06-16):** Implemented per plan. As-built decisions that resolved the open design questions in §13:
> 1. **NDT type detection** — `fpi.required` / `mpt.required` derived from presence of a linked `FpiJob` (by `work_order_ref = wo.wo_number`) / `MptJob` (by `MptJob.work_order_id`), falling back to `WoStep.process_type IN ('FPI','MPT')`. MPT completion uses status `ACCEPTED` (MptJob has no `COMPLETE` state); FPI uses `COMPLETE`.
> 2. **Production stage** — derived from `WoStep.route_card_id` linked steps: complete when all route-card steps are `COMPLETE`; `N/A` (treated as passed) when the WO has no route-card steps. No MOD-10 schema change needed.
> 3. **Delivery linkage** — resolved via `CertificateOfConformance.delivery_order_id` first, else via `DeliveryOrder.review_id = WorkOrder.contract_review_id`. No extra FK added to migration 028.
> 4. **NCR blocking** — open NCRs joined by `NCR.work_order_ref = wo.wo_number` (status NOT IN CLOSED/CANCELLED); also blocks on GRN `REJECTED`/`QUARANTINE` and any NDT `REJECT` disposition.
>
> **Scope adjustment:** the sidebar "Value Flow" nav entry was added only to the Layout-A modules that have a sidebar module list (MOD-09, MOD-10) plus the home page. The Layout-B/C participating modules (MOD-03, MOD-13, MOD-17, MOD-24) use a top navbar with no sidebar list, so they reach MOD-27 via the global home button and the home-page card instead.

---

## 1. Overview

MOD-27 provides a visual, interactive **Value Flow Diagram** that maps the complete lifecycle of a job — from Customer Purchase Order / Delivery Order through to the outgoing Certificate of Conformance and Delivery. Every stage node is clickable and navigates to the owning module. A GRN search bar lets staff look up any active job by GRN reference and see exactly which stage it is currently at, with colour-coded status indicators.

**Compliance hook:** AS9100D §8.5 (Production & Service Provision — planning and control); supports NADCAP audit traceability by making the full process chain visible in one place.

**Access:** View = `NDT_INSPECTOR+` (any operational role). No write operations — read-only dashboard.

---

## 2. Value Flow Stages

Eight sequential stages form the pipeline. Stages 5a/5b are parallel branches (FPI and/or MPT may both apply to the same job):

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ STAGE 1  │→  │ STAGE 2  │→  │ STAGE 3  │→  │ STAGE 4  │
│ Customer │   │ Goods    │   │ Work     │   │ Production│
│ PO / CR  │   │ Receipt  │   │ Order &  │   │ Conditions│
│ (MOD-09) │   │ (GRN)    │   │ Job Steps│   │ (MOD-10)  │
│          │   │ (MOD-09) │   │ (MOD-13) │   │           │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
                                                    ↓
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ STAGE 8  │←  │ STAGE 7  │←  │ STAGE 6  │←  │ STAGE 5  │
│ Delivery │   │Certificate│  │ QA Final │   │ NDT      │
│ Order    │   │of Conform.│  │ Sign-off │   │ Process  │
│ (MOD-09) │   │ (MOD-24) │   │ (MOD-13) │   │ FPI/MPT  │
│          │   │          │   │          │   │ (03/17)  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
```

| Stage | Label | Module | Status Field | Module Link |
|-------|-------|--------|--------------|-------------|
| 1 | Customer PO / Contract Review | MOD-09 | `ContractReview.status` (`PENDING`→`APPROVED`) | `/modules/mod09-sales-customer-service/` |
| 2 | Goods Receiving Note (GRN) | MOD-09 | `GoodsReceivingNote.status` (`PENDING`→`ACCEPTED`) | `/modules/mod09-sales-customer-service/` |
| 3 | Work Order & Job Steps | MOD-13 | `WorkOrder.status` (`ISSUED`→`IN_PROGRESS`) | `/modules/mod13-work-order/` |
| 4 | Production Conditions | MOD-10 | `WorkOrder` has steps with `process_type='PRODUCTION'` | `/modules/mod10-production-management/` |
| 5a | FPI Process | MOD-03 | `FpiJob.status` (`IN_PROGRESS`→`COMPLETE`) | `/modules/mod03-fpi-process/` |
| 5b | MPT Process | MOD-17 | `MptJob.status` (`IN_PROGRESS`→`COMPLETE`) | `/modules/mod17-mpt-process/` |
| 6 | QA Final Sign-off | MOD-13 | `WorkOrder.status = 'PENDING_QA'`→`'COMPLETE'` | `/modules/mod13-work-order/` |
| 7 | Certificate of Conformance | MOD-24 | `CertificateOfConformance.status` (`DRAFT`→`ISSUED`) | `/modules/mod24-certificate-of-conformance/` |
| 8 | Delivery Order | MOD-09 | `DeliveryOrder.status` (`READY`→`SHIPPED`) | `/modules/mod09-sales-customer-service/` |

### Stage Status → Colour Mapping

| Colour | CSS class | Meaning |
|--------|-----------|---------|
| Grey | `.vf-stage--pending` | Not started (upstream not yet complete) |
| Blue | `.vf-stage--active` | Currently in progress |
| Amber | `.vf-stage--waiting` | Waiting for action (approval, sign-off, etc.) |
| Green | `.vf-stage--complete` | Complete |
| Red | `.vf-stage--blocked` | Rejected / NCR raised / blocked |

---

## 3. Database Change (Migration 028)

### 3.1 Add `grn_id` FK to `WorkOrder`

Currently `WorkOrder.order_reference` is a free-text field used to record the PO or GRN reference. To enable a reliable GRN → Work Order lookup without string matching, add an explicit FK:

```sql
-- File: src/database/migrations/028_mod27_value_flow.sql

ALTER TABLE dbo.WorkOrder
  ADD grn_id INT NULL
      CONSTRAINT FK_WorkOrder_Grn FOREIGN KEY REFERENCES dbo.GoodsReceivingNote(grn_id);

-- Index for reverse lookup (GRN → WO)
CREATE INDEX IX_WorkOrder_GrnId ON dbo.WorkOrder (grn_id) WHERE grn_id IS NOT NULL;

-- Sequence table for MOD-27 (reserved — no numbered records but follows project convention)
-- (No sequence table needed — MOD-27 is read-only)
```

### 3.2 Backfill (optional, for existing data)

```sql
-- Match existing free-text order_reference to grn_ref where unambiguous
UPDATE wo
SET wo.grn_id = g.grn_id
FROM dbo.WorkOrder wo
JOIN dbo.GoodsReceivingNote g ON g.grn_ref = wo.order_reference
WHERE wo.grn_id IS NULL AND g.is_active = 1;
```

---

## 4. Backend API

**Mount point:** `GET /api/v1/mod27/...`
**File:** `src/backend/api/mod27/index.js`
**Mount in server.js:** `apiRouter.use('/mod27', require('./api/mod27/index'));`

### 4.1 Endpoints

#### `GET /api/v1/mod27/alerts/summary`
KPI tiles for home dashboard / MOD-15 roll-up.

```json
{
  "active_jobs":      12,
  "grn_pending":       3,
  "coc_pending":       2,
  "shipped_today":     5,
  "total":            17
}
```

SQL:
```sql
SELECT
  (SELECT COUNT(*) FROM dbo.WorkOrder WHERE status IN ('ISSUED','IN_PROGRESS','PENDING_QA') AND is_active=1) AS active_jobs,
  (SELECT COUNT(*) FROM dbo.GoodsReceivingNote WHERE status='PENDING' AND is_active=1)                        AS grn_pending,
  (SELECT COUNT(*) FROM dbo.WorkOrder WHERE status='COMPLETE' AND coc_issued=0 AND is_active=1)               AS coc_pending,
  (SELECT COUNT(*) FROM dbo.DeliveryOrder WHERE status='SHIPPED' AND CAST(shipped_date AS DATE)=CAST(GETDATE() AS DATE) AND is_active=1) AS shipped_today
```

**RBAC:** `requireMinRole('NDT_INSPECTOR')`

---

#### `GET /api/v1/mod27/active-grns`
Typeahead list of GRNs for the search input.

Query params: `?q=GRN-2026` (optional prefix filter), `?limit=20`

```json
{
  "items": [
    { "grn_ref": "GRN-2026-0042", "customer_name": "Rolls-Royce", "received_date": "2026-06-10", "status": "ACCEPTED" }
  ]
}
```

SQL:
```sql
SELECT TOP @limit
  g.grn_ref, c.company_name AS customer_name, g.received_date, g.status
FROM dbo.GoodsReceivingNote g
LEFT JOIN dbo.Customer c ON c.customer_id = g.customer_id
WHERE g.is_active = 1
  AND (@q = '' OR g.grn_ref LIKE @q + '%')
  AND g.status IN ('PENDING','ACCEPTED')
ORDER BY g.received_date DESC
```

**RBAC:** `requireMinRole('NDT_INSPECTOR')`

---

#### `GET /api/v1/mod27/flow/:grn_ref`
Full value flow chain status for a specific GRN. This is the core endpoint powering the GRN lookup feature.

Response shape:
```json
{
  "grn_ref": "GRN-2026-0042",
  "customer_name": "Rolls-Royce",
  "stages": {
    "contract_review": { "ref": "CR-2026-0031", "status": "APPROVED", "approved_date": "2026-06-05" },
    "grn":             { "ref": "GRN-2026-0042", "status": "ACCEPTED", "received_date": "2026-06-06", "inspection_done": true },
    "work_order":      { "ref": "WO-2026-0019", "work_order_id": 19, "status": "IN_PROGRESS", "planned_end": "2026-06-20", "steps_done": 3, "steps_total": 6 },
    "production":      { "conditions_met": true, "checklist_complete": true },
    "fpi":             { "required": true, "ref": "FPI-2026-0007", "status": "COMPLETE", "disposition": "ACCEPT" },
    "mpt":             { "required": false },
    "qa_signoff":      { "status": "PENDING_QA", "assigned_to": "Jane Lim" },
    "coc":             { "ref": null, "status": "NOT_ISSUED" },
    "delivery":        { "ref": null, "status": "NOT_READY" }
  },
  "current_stage": 6,
  "blocked": false,
  "ncr_open": 0
}
```

SQL strategy (sequential queries, assembled in JS):
1. Fetch GRN + customer by `grn_ref`
2. Fetch most recent Contract Review via `grn_id` → WorkOrder → `contract_review_id`
3. Fetch Work Order by `grn_id`
4. Fetch WoStep counts (`done_steps`, `total_steps`)
5. Fetch FpiJob by `work_order_ref = wo.wo_number`
6. Fetch MptJob by `work_order_ref = wo.wo_number`
7. Fetch COC by `work_order_id`
8. Fetch DeliveryOrder by `grn_id` or `order_reference = grn_ref`
9. Count open NCRs linked to `work_order_id` or part number

`current_stage` is computed in Node: walk stages 1–8, return first stage that is not `COMPLETE`.

**RBAC:** `requireMinRole('NDT_INSPECTOR')`

---

## 5. Frontend

**File:** `src/frontend/modules/mod27-value-flow/index.html`
**Layout:** Layout A (`#topbar` + `#sidebar`) — consistent with MOD-09, MOD-13 etc.

### 5.1 Page Structure

```
TOPBAR
  [⌂] MOD-27 — Value Flow Tracker  |  AS9100D §8.5 · Process Traceability  |  🔔  👤
SIDEBAR (standard)

PAGE CONTENT
  Breadcrumb: Home / Value Flow Tracker

  KPI TILES (4)
    Active Jobs | GRN Pending | COC Pending | Shipped Today

  ─────────────────────────────────────────────────────────
  GRN LOOKUP BAR
    [🔍 Search by GRN ref, e.g. GRN-2026-0042 ▼]  [Clear]

  When a GRN is selected:
    CONTEXT HEADER: GRN-2026-0042 | Rolls-Royce | Received 2026-06-06
    ● Currently at: Stage 6 — QA Final Sign-off

  ─────────────────────────────────────────────────────────
  VALUE FLOW DIAGRAM (SVG/HTML)
    8 stage nodes arranged in two rows of 4 (desktop) or stacked (mobile)
    Arrows between nodes
    Each node shows: stage number, icon, label, module badge
    When GRN loaded: each node gets status class (pending/active/waiting/complete/blocked)
    Click any node → navigate to module page

  STAGE DETAIL PANEL (shown when a node is clicked while a GRN is loaded)
    Shows: ref number, status, dates, assigned person, key fields
    "Open in [Module]" button
  ─────────────────────────────────────────────────────────
```

### 5.2 Value Flow Diagram — HTML/CSS Implementation

The diagram uses a CSS Grid layout with Bootstrap 5 cards for each stage node. Arrows are rendered as CSS pseudo-elements or inline SVG connectors between grid cells.

```html
<div class="vf-diagram" id="vf-diagram">
  <!-- Row 1: Stages 1–4 (left to right) -->
  <div class="vf-stage vf-stage--pending" id="vf-s1" data-stage="1" data-href="/modules/mod09-sales-customer-service/" tabindex="0" role="button">
    <div class="vf-stage-num">1</div>
    <i class="bi bi-file-earmark-text vf-icon"></i>
    <div class="vf-stage-label">Customer PO<br>/ Contract Review</div>
    <span class="badge bg-secondary vf-mod-badge">MOD-09</span>
    <div class="vf-stage-status-dot"></div>
  </div>
  <div class="vf-arrow">→</div>
  <div class="vf-stage vf-stage--pending" id="vf-s2" data-stage="2" data-href="/modules/mod09-sales-customer-service/" ...>
    <div class="vf-stage-num">2</div>
    <i class="bi bi-box-seam vf-icon"></i>
    <div class="vf-stage-label">Goods Receiving<br>Note (GRN)</div>
    <span class="badge bg-secondary vf-mod-badge">MOD-09</span>
  </div>
  <!-- ... stages 3, 4 ... -->

  <!-- Row 2: Stages 5–8 (right to left, reverse direction) -->
  <!-- Stage 5 is split: 5a FPI (MOD-03), 5b MPT (MOD-17) shown as a branched card -->
  ...
</div>
```

Stage node states controlled by JS adding/removing CSS classes:
- `.vf-stage--pending`  → grey outline, grey icon
- `.vf-stage--active`   → blue outline + blue icon + pulse animation
- `.vf-stage--waiting`  → amber outline + amber icon
- `.vf-stage--complete` → green outline + green check overlay
- `.vf-stage--blocked`  → red outline + red ✕ overlay

### 5.3 JavaScript Logic

All page logic in the `<script>` block; uses `ATCA.initPage()` and `ATCA.api.*` per project conventions.

```javascript
// On page load
ATCA.initPage();
loadKpis();          // GET /mod27/alerts/summary → fill 4 KPI tiles

// GRN search typeahead
const grnInput = document.getElementById('grn-search');
grnInput.addEventListener('input', debounce(async () => {
  const q = grnInput.value.trim();
  if (q.length < 3) return clearSuggestions();
  const data = await ATCA.api.get(`/mod27/active-grns?q=${encodeURIComponent(q)}&limit=10`);
  renderSuggestions(data.items);
}, 250));

// On GRN selected
async function loadFlow(grnRef) {
  const data = await ATCA.api.get(`/mod27/flow/${encodeURIComponent(grnRef)}`);
  renderContextHeader(data);
  applyStageStatuses(data.stages, data.current_stage, data.blocked);
  showDetailPanel(data.stages[stageKeys[data.current_stage - 1]]);
}

// Stage status renderer
function applyStageStatuses(stages, currentStage, blocked) {
  const stageMap = {
    1: stages.contract_review,
    2: stages.grn,
    3: stages.work_order,
    4: stages.production,
    '5a': stages.fpi,
    '5b': stages.mpt,
    6: stages.qa_signoff,
    7: stages.coc,
    8: stages.delivery,
  };
  Object.entries(stageMap).forEach(([key, s]) => {
    const el = document.getElementById(`vf-s${key}`);
    if (!el || !s) return;
    el.className = el.className.replace(/vf-stage--\w+/g, '').trim();
    el.classList.add(getStageClass(s, parseInt(key), currentStage, blocked));
    updateStageDetail(el, s);
  });
}

// Node click → navigate to module
document.querySelectorAll('.vf-stage[data-href]').forEach(node => {
  node.addEventListener('click', () => {
    window.location.href = node.dataset.href;
  });
  node.addEventListener('keydown', e => { if (e.key === 'Enter') node.click(); });
});
```

### 5.4 Mobile Responsiveness

On viewports < 768px, the diagram stacks vertically (single column) with vertical arrows. CSS: `@media (max-width: 767px) { .vf-diagram { grid-template-columns: 1fr; } }`.

---

## 6. Preview Server Stub

Add to `preview_server.py` STUBS dict:

```python
"GET /api/v1/mod27/alerts/summary": {
    "active_jobs": 8, "grn_pending": 2, "coc_pending": 3, "shipped_today": 4, "total": 13
},
"GET /api/v1/mod27/active-grns": {
    "items": [
        {"grn_ref": "GRN-2026-0042", "customer_name": "Rolls-Royce Singapore", "received_date": "2026-06-10", "status": "ACCEPTED"},
        {"grn_ref": "GRN-2026-0041", "customer_name": "ST Engineering", "received_date": "2026-06-08", "status": "ACCEPTED"},
        {"grn_ref": "GRN-2026-0040", "customer_name": "SIA Engineering", "received_date": "2026-06-05", "status": "PENDING"},
    ]
},
"GET /api/v1/mod27/flow/GRN-2026-0042": {
    "grn_ref": "GRN-2026-0042",
    "customer_name": "Rolls-Royce Singapore",
    "stages": {
        "contract_review": {"ref": "CR-2026-0031", "status": "APPROVED", "approved_date": "2026-06-05"},
        "grn":             {"ref": "GRN-2026-0042", "status": "ACCEPTED", "received_date": "2026-06-06", "inspection_done": True},
        "work_order":      {"ref": "WO-2026-0019", "work_order_id": 19, "status": "IN_PROGRESS", "planned_end": "2026-06-20", "steps_done": 3, "steps_total": 6},
        "production":      {"conditions_met": True, "checklist_complete": True},
        "fpi":             {"required": True, "ref": "FPI-2026-0007", "status": "COMPLETE", "disposition": "ACCEPT"},
        "mpt":             {"required": False},
        "qa_signoff":      {"status": "PENDING_QA", "assigned_to": "Jane Lim"},
        "coc":             {"ref": None, "status": "NOT_ISSUED"},
        "delivery":        {"ref": None, "status": "NOT_READY"}
    },
    "current_stage": 6,
    "blocked": False,
    "ncr_open": 0
},
```

Note: the preview server uses prefix matching, so `GET /api/v1/mod27/flow/` handles all flow lookups with the same stub — add a `startswith` handler for the dynamic `:grn_ref` segment.

---

## 7. Home Page Card

Add to `src/frontend/index.html` SYSTEM section:

```html
<div class="module-card" onclick="window.location='/modules/mod27-value-flow/'">
  <span class="module-badge" style="background:#0d6efd;">MOD-27</span>
  <i class="bi bi-diagram-2 module-icon"></i>
  <div class="module-title">Value Flow Tracker</div>
  <div class="module-sub">PO → GRN → WO → NDT → COC · Process Traceability</div>
</div>
```

---

## 8. Sidebar Nav

Add to all module sidebars (or at minimum to the SYSTEM section in each sidebar), after the KPI Dashboard entry:

```html
<a href="/modules/mod27-value-flow/" class="nav-link">
  <span class="nav-icon"><i class="bi bi-diagram-2"></i></span>Value Flow
</a>
```

This entry should be added to the sidebar in every module that participates in the value chain: MOD-09, MOD-10, MOD-13, MOD-03, MOD-17, MOD-24.

---

## 9. `server.js` Mount

```javascript
// In server.js apiRouter section:
apiRouter.use('/mod27', require('./api/mod27/index'));   // Value Flow Tracker
```

---

## 10. Implementation Sequence

| Step | Task | Effort |
|------|------|--------|
| 1 | Write migration `028_mod27_value_flow.sql` (add `grn_id` FK + index to `WorkOrder`) | 0.5h |
| 2 | Write `src/backend/api/mod27/index.js` — 3 endpoints | 2h |
| 3 | Mount in `server.js` | 5 min |
| 4 | Write `src/frontend/modules/mod27-value-flow/index.html` — full page with SVG flow diagram, GRN search, detail panel | 4h |
| 5 | Add preview server stubs to `preview_server.py` | 15 min |
| 6 | Add MOD-27 card to `index.html` home page SYSTEM section | 15 min |
| 7 | Add Value Flow nav entry to participating module sidebars (MOD-09, 10, 13, 03, 17, 24) | 30 min |
| 8 | Update all `.md` files | 30 min |
| 9 | Preview server test — load page, test GRN lookup with stub data, verify all stage transitions | 30 min |
| **Total** | | **~8h** |

---

## 11. Test Cases

| ID | Test | Pass Criteria |
|----|------|---------------|
| T-VF-01 | Page loads without auth → redirect to login | 302 → /login |
| T-VF-02 | NDT_INSPECTOR role can view page | 200 OK |
| T-VF-03 | KPI tiles load from `/mod27/alerts/summary` | 4 tiles populated |
| T-VF-04 | GRN search typeahead with `?q=GRN-2026` | Returns matching items |
| T-VF-05 | Select `GRN-2026-0042` — flow loads | 8-stage diagram updates; stage 6 highlighted blue |
| T-VF-06 | Completed stages show green | Stages 1–5 show `.vf-stage--complete` |
| T-VF-07 | Active stage pulses | Stage 6 has `.vf-stage--active` + CSS animation |
| T-VF-08 | Click Stage 3 node | Navigates to `/modules/mod13-work-order/` |
| T-VF-09 | Click Stage 5a (FPI) node | Navigates to `/modules/mod03-fpi-process/` |
| T-VF-10 | Stage detail panel shows correct data | Stage 6 panel: "QA Final Sign-off — PENDING_QA — assigned: Jane Lim" |
| T-VF-11 | GRN with blocked stage (NCR open) | Affected stage shows `.vf-stage--blocked` in red |
| T-VF-12 | GRN with COC issued | Stage 7 shows `.vf-stage--complete` green |
| T-VF-13 | GRN not found | Toast: "GRN not found or not active" |
| T-VF-14 | Mobile (375px) layout | Diagram stacks vertically, no overflow |
| T-VF-15 | Keyboard nav — Tab to stage node + Enter | Navigates to module |

---

## 12. Files to Create / Modify

### New Files
| File | Description |
|------|-------------|
| `src/database/migrations/028_mod27_value_flow.sql` | Add `grn_id` FK to `WorkOrder`; index |
| `src/backend/api/mod27/index.js` | 3 endpoints: alerts/summary, active-grns, flow/:grn_ref |
| `src/frontend/modules/mod27-value-flow/index.html` | Full page: Layout A, SVG diagram, GRN search |

### Modified Files
| File | Change |
|------|--------|
| `src/backend/server.js` | Mount `/mod27` router |
| `src/frontend/index.html` | Add MOD-27 card to SYSTEM section |
| `preview_server.py` | Add 3 new stubs + dynamic flow handler |
| Sidebar of MOD-09, 10, 13, 03, 17, 24 | Add "Value Flow" nav entry |
| `MEMORY.md` | Add MOD-27 to build registry |
| `TEST-PLAN.md` | Add §3.15 MOD-27 integration tests (T-VF-01–15), §7 alerts/summary row |
| `README.md` | Add MOD-27 to System module table |
| `memory/project-overview.md` | Update module registry |

---

## 13. Open Design Questions

1. **NDT type detection:** How does the system know if a WO requires FPI, MPT, or both? Currently `WoStep.process_type` may carry `'FPI'` or `'MPT'` flags — verify this in `014_mod13_work_order.sql`. If not, detect by presence of linked `FpiJob`/`MptJob` records.

2. **Production Conditions stage:** MOD-10 stores Route Cards and Production Conditions. The V-flow "Stage 4 complete" condition should be: `WorkOrder` has at least one linked route card with status `APPROVED`. Verify `ProductionCondition` table schema in `015_mod10_production.sql` to confirm the linkage field.

3. **DeliveryOrder → GRN linkage:** `DeliveryOrder.order_reference` may need to be linked to `grn_id` similar to the WO change. If so, add to migration 028.

4. **NCR blocking logic:** An NCR raised against a part number that appears on a GRN should mark the affected flow stage as "blocked". Requires joining `NCR` table by `part_number` or `work_order_id`.

---

*End of MOD-27 Dev Plan*
