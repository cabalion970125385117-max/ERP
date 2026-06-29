# MOD-14 Inventory Management — Enhancement Summary
**Date:** 2026-06-24  
**Module:** MOD-14 · Inventory Management  
**Compliance:** AS9100D §8.5.4 (customer property), §7.1.4  
**File:** `src/frontend/modules/mod14-inventory/index.html`  
**Supporting file:** `src/frontend/user-dashboard.html`

---

## Overview

This document summarises all features added to MOD-14 Inventory Management across the 2026-06-23/24 session. The module was enhanced from a basic stock register with manual quick-receipt into a full lot-tracked, vendor-linked, expiry-managed inventory system with approval-gated extension and scrap workflows.

---

## Features Delivered

### 1. Lot Expiry Tracking

**What was built:**
- Each item gains a `default_lot_expiry_days` field (numeric, default 365).
- Each RECEIPT movement now captures `lot_expiry` (ISO date) and `receipt_location` (the item's location at time of receipt).
- The Inventory Register table adds a **"Next Lot Exp."** column showing the nearest upcoming expiry date per item, colour-coded (green / amber / red badge).
- A dedicated **Lot Expiry tab** (`#tab-lots`) lists all lots across all items with columns: Item Code, Item Name, Lot No., Received, Qty, Expiry Date, Days Left, Status, Actions.
- Filter dropdown: All Lots / Expired / Expiring Soon (≤30 days) / OK.
- Lots sorted by expiry date ascending (expired first).

**KPI card:**
- 5th KPI card added: **"Lots Expiring / Expired"** (RAG red on count > 0).
- Tab badge (`#lot-expiry-badge`) shows count of SOON + OVER lots.

**CSS classes added:**
```css
.lot-badge { display:inline-block; font-size:.7rem; font-weight:600; padding:1px 6px; border-radius:3px; white-space:nowrap; line-height:1.4; }
.lot-ok   { background:#d1e7dd; color:#0a3622; }
.lot-soon { background:#fff3cd; color:#664d03; }
.lot-over { background:#f8d7da; color:#58151c; }
```

**Key functions:**
- `getItemLots(itemId)` — reads `atca_pending_approvals`, filters APPROVED RECEIPT records for the item, dedupes by `lot_number`, returns `{ lot, expiry, qty, received }` array.
- `getLotsSummary()` — counts SOON (≤30d) and OVER (< 0d) lots across all items.
- `lotExpiryBadgeHtml(itemId)` — returns nearest expiry badge HTML for the register column.
- `renderLots()` — renders the Lot Expiry tab table; called on tab `shown.bs.tab`.
- `daysUntil(dateStr)` — returns integer days (negative = expired).

---

### 2. Lot Expiry Extension Workflow

**Flow:**
1. User clicks **Extend** button on a lot row (Lot Expiry tab or Item Lots modal).
2. `openExtendModal(itemId, lot, currentExpiry)` populates `#extendLotModal`.
3. User enters proposed expiry date + uploads mandatory evidence file + optional notes.
4. `saveExtension()` validates and pushes a `LOT_EXTENSION` record to `atca_pending_approvals` with fields: `item_id`, `item_code`, `lot_number`, `current_expiry`, `proposed_expiry`, `evidence_data` (base64 data URL), `evidence_name`, `notes`.
5. Lot row shows **"Ext. Pending"** badge instead of Extend button while pending.
6. In **user-dashboard**, `approveItem()` branches on `movement_type === 'LOT_EXTENSION'` → calls `applyLotExtension(apr)` which updates `lot_expiry` on all matching APPROVED RECEIPT records for that item+lot.

**user-dashboard.html changes:**
```js
const TYPE_COLOR = { ..., LOT_EXTENSION: 'secondary' };
const TYPE_ICON  = { ..., LOT_EXTENSION: 'bi-calendar-plus' };
```
- `extraDetails()` renders Lot No., Current Expiry, Proposed Expiry, Evidence filename, Notes for LOT_EXTENSION records.
- `qty` display made conditional (`a.qty != null ? ...`) so LOT_EXTENSION cards don't show "undefined undefined".

---

### 3. Vendor (AVL) + Lead Time per Item

**What was added to the Item modal:**
| Field | ID | Type |
|---|---|---|
| Preferred Vendor (AVL) | `#i-vendor` | `<select>` populated from MOD-12 |
| Lead Time (days) | `#i-lead-time` | `<input type="number">` |
| Default Lot Expiry (days) | `#i-lot-expiry-days` | `<input type="number" value="365">` |

**Data source:** `loadVendors()` calls `/mod12/suppliers?status=APPROVED` and populates the vendor dropdown.

**Display:** Inventory Register Name column shows a second sub-line:
```
Zyglo ZL-2C Penetrant
[supplier icon] Ardrox Aerospace · Lead: 14d
```

**Saved fields on item:** `vendor_id`, `vendor_name`, `lead_time_days`, `default_lot_expiry_days`.

---

### 4. Quick Receipt Removed

The **Quick Stock Receipt** button and `#quickReceiptModal` were fully removed. All stock movements — including receipts — now go through the **Stock Movements tab** only.

**Bug fixed during removal:** Leaving `const quickReceiptModal = new bootstrap.Modal(document.getElementById('quickReceiptModal'))` in JS after removing the HTML caused `getElementById` to return `null`, crashing the entire script block and leaving `DB.items = []` (no data rendered). Fixed by removing the constant declaration.

---

### 5. RECEIPT Movement — Lot Fields

The RECEIPT section in the Stock Movements modal was extended from 3 to 4 columns:

| Field | ID | Notes |
|---|---|---|
| Lot Number | `#m-lot-number` | Text |
| DO Number | `#m-do-number` | Text |
| **Lot Expiry Date** | `#m-lot-expiry` | `<input type="date">` — new |
| COC File | `#m-coc-file` | File upload |

`saveMovement()` for RECEIPT now stores `lot_expiry` and `receipt_location: it.location || null` on the approval record.

---

### 6. DISPOSAL — Mandatory Lot Selection

DISPOSAL movement type now requires selecting a lot before submission.

**New field:** `#m-disposal-lot` — a `<select>` dropdown as the first field in the DISPOSAL section.

**Population:** Both `onMovementTypeChange()` and `onMovementItemChange()` populate `#m-disposal-lot` with `lotOptions(itemId)` when type is DISPOSAL.

**`lotOptions(itemId)`** returns:
```js
'<option value="">— Select lot —</option>'
+ lots.map(l => `<option value="${l.lot}">${l.lot}${l.expiry ? ` (exp: ${l.expiry})` : ''}</option>`)
```

**Validation:** `saveMovement()` checks `disposalLot` is non-empty and stores `lot_number: disposalLot` on the approval.

---

### 7. Item Lots Modal (`#itemLotsModal`)

**Trigger:** Archive icon button (`bi-archive`) per inventory row — `openItemLots(itemId)`.

**Modal:** Bootstrap xl, search bar (`#lots-modal-search`), lot table with columns:

| Lot No. | DO No. | Received | Qty | Storage Location | Expiry Date | Days Left | Status | Files | Actions |
|---|---|---|---|---|---|---|---|---|---|

**Search:** Filters by lot no., DO no., or location (case-insensitive, live on input).

**Files column:** COC file button (`openAprFile(aprId, 'coc_data')`) + extension evidence buttons per extension record, colour-coded by status (APPROVED=green, PENDING=amber, REJECTED=red).

**Actions column:** Extend button + Scrap button per lot row (same pending-badge pattern as Lot Expiry tab). Extend calls `itemLotsModal.hide()` first (Bootstrap stacked modal handling), Scrap calls `openScrapModal(itemId, lot, 'lots')`.

**Key functions:**
- `openItemLots(itemId)` — sets `_lotsItemId`, populates item name, calls `renderItemLots()`, shows modal.
- `renderItemLots()` — renders filtered lot rows; wired to `#lots-modal-search` input.
- `openAprFile(aprId, field)` — fetches the data URL from the approval record and opens it in a new tab via `URL.createObjectURL`.

---

### 8. Scrap Popup (`#scrapLotModal`)

**Trigger:** Trash button per lot row in Lot Expiry tab (`openScrapModal(itemId, lot)`) or Item Lots modal (`openScrapModal(itemId, lot, 'lots')`).

**Modal fields:**

| Field | ID | Notes |
|---|---|---|
| Item + Lot (read-only header) | — | Populated from RECEIPT data |
| Expiry context | — | Shows "Expired Xd ago" / "Expires in Xd" |
| Scrap Qty | `#scrap-qty` | Pre-filled from RECEIPT qty |
| Disposal Method | `#scrap-method` | WASTEWATER / INCINERATION / LANDFILL / RETURN_VENDOR |
| Vendor Ref (conditional) | `#scrap-ref` | Shown only if method = RETURN_VENDOR |
| Notes | `#scrap-notes` | Optional |

**`onScrapMethodChange()`** toggles `#scrap-ref-wrap` visibility on method change.

**`saveScrap()`** validates qty > 0, pushes to `atca_pending_approvals`:
```js
{
  movement_type: 'DISPOSAL',
  item_id, item_code, unit,
  qty: scrapQty,
  lot_number: lot,
  disposal_method: method,
  disposal_ref: ref,
  notes,
  status: 'PENDING'
}
```

Lot row shows **"Scrap Pending"** badge while pending.

---

### 9. Demo Seed Lots (`_seedDemoLots()`)

Since lot data only appears after approved RECEIPT movements, `_seedDemoLots()` is called at `init()` to pre-populate 5 realistic lots on first load.

**Condition:** Only runs if no MOD-14 RECEIPT approvals already exist in `atca_pending_approvals`.

**Seeded lots:**

| Item idx | Lot No. | Expiry offset | Qty |
|---|---|---|---|
| 0 (INV-2026-0001) | LOT-2026-001 | +18d | 50 |
| 1 (INV-2026-0002) | LOT-2025-018 | −12d (expired) | 20 |
| 2 (INV-2026-0003) | LOT-2026-003 | +180d | 100 |
| 0 (INV-2026-0001) | LOT-2026-002 | +365d | 80 |
| 3 (INV-2026-0004) | LOT-2026-004 | +7d | 15 |

Each record: `status: 'APPROVED'`, `module: 'MOD-14'`, `movement_type: 'RECEIPT'`, includes `lot_number`, `lot_expiry`, `do_number: 'DO-SEED-001'`, `receipt_location: it.location`.

---

## Data Model (localStorage — `atca_mod14_v1`)

### InventoryItem (extended)
```js
{
  item_id, item_code, name, category, unit, location,
  storage_conditions, hazardous_flag, incompatible_materials,
  reorder_level, critical_level, current_stock,
  // NEW:
  vendor_id, vendor_name, lead_time_days, default_lot_expiry_days,
  docs: []
}
```

### Approval record — RECEIPT (extended)
```js
{
  approval_id, module: 'MOD-14', movement_type: 'RECEIPT',
  item_id, item_code, unit, qty,
  lot_number, do_number,
  // NEW:
  lot_expiry,       // ISO date string
  receipt_location, // item's location at time of receipt
  coc_data, coc_name,
  status: 'APPROVED' | 'PENDING',
  requested_at, requested_by
}
```

### Approval record — LOT_EXTENSION (new)
```js
{
  approval_id, module: 'MOD-14', movement_type: 'LOT_EXTENSION',
  item_id, item_code, lot_number,
  current_expiry, proposed_expiry,
  evidence_data, evidence_name, notes,
  status: 'PENDING' | 'APPROVED' | 'REJECTED',
  requested_at, requested_by
}
```

### Approval record — DISPOSAL with lot (extended)
```js
{
  approval_id, module: 'MOD-14', movement_type: 'DISPOSAL',
  item_id, item_code, unit, qty,
  // NEW:
  lot_number, disposal_method, disposal_ref,
  notes,
  status: 'PENDING',
  requested_at, requested_by
}
```

---

## Approval Queue Integration (`atca_pending_approvals`)

| Movement Type | Who submits | Who approves | Effect on approval |
|---|---|---|---|
| RECEIPT | Stock Movements tab | user-dashboard | `applyMod14Stock()` — updates `current_stock` |
| DISPOSAL | Stock Movements tab / Scrap popup | user-dashboard | `applyMod14Stock()` — decrements `current_stock` |
| LOT_EXTENSION | Extend button (any lot view) | user-dashboard | `applyLotExtension()` — updates `lot_expiry` on all matching RECEIPT records |
| REQUEST / TRANSFER | Stock Movements tab | user-dashboard | `applyMod14Stock()` |

---

## UI Changes Summary

### Inventory Register tab
- Column count: 11 → 12 (added "Next Lot Exp.")
- Empty state colspan updated: 11 → 12
- Name cell: vendor sub-line added
- Action buttons per row: Edit | View Docs | **View Lots** (archive icon — `openItemLots()`)
- Quick receipt button: **removed**

### Stock Movements modal
- RECEIPT section: 3 → 4 columns (added Lot Expiry Date field)
- DISPOSAL section: first field is now mandatory "Lot to Scrap" dropdown

### New modals (in DOM order)
1. `#scrapLotModal` — danger header, scrap lot/qty/method/ref/notes
2. `#itemLotsModal` — xl, per-item lot viewer with search
3. `#extendLotModal` — proposed expiry + evidence file + notes

### New tabs
- **Lot Expiry** (`#tab-lots`) — between Stock Movements and Locations

### KPI row
- 3-card → 5-card layout (`col-6 col-md` auto-width for equal spacing)
- Card 4: "Lots Expiring / Expired" (RAG red)
- Card 5: "Total Items" (green)

---

## Bugs Encountered and Fixed

| Bug | Cause | Fix |
|---|---|---|
| `new bootstrap.Modal(null)` crash — page showed no data | Removed `#quickReceiptModal` HTML but left JS constant referencing it | Removed the constant declaration |
| `onDisposalMethodChange()` class mismatch | Old code checked for absence of class without `d-none`; new markup uses `d-none` | Updated to toggle `d-none` consistently; added `onScrapMethodChange()` for scrap modal |
| LOT_EXTENSION cards showing "undefined undefined" | `qty` rendered unconditionally in pendingCard/historyCard/myRequests | Made qty display conditional: `a.qty != null ? ...` |

---

## Files Modified

| File | Changes |
|---|---|
| `src/frontend/modules/mod14-inventory/index.html` | All MOD-14 frontend changes (see above) |
| `src/frontend/user-dashboard.html` | LOT_EXTENSION type/icon/color; `applyLotExtension()`; conditional qty display; `extraDetails()` LOT_EXTENSION fields |
| `MEMORY.md` | Dev log entry 2026-06-24; updated frontend table row for MOD-14; updated MOD-14 section detail |
| `memory/project-overview.md` | MOD-14 row updated; Phase 5 table entry updated |

---

## Preview Verification (2026-06-24)

| Check | Result |
|---|---|
| Page loads, no console errors | ✅ |
| 5 KPI cards render correctly | ✅ |
| "Lots Expiring / Expired: 3" badge on Lot Expiry tab | ✅ |
| Next Lot Exp. column in Inventory Register | ✅ |
| Lot Expiry tab — 5 seed lots with Extend + Scrap buttons per row | ✅ |
| Item Lots modal (archive icon) — lots with Extend + Scrap buttons per row | ✅ |
| No quick receipt button visible | ✅ |
