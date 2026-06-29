# ATCA-ERP — UI/UX Design Reference
**ATC Aviation Pte Ltd | AS9100D · NADCAP AC7114 · NAS410 | v1.0**

---

## 1. Brand Identity

| Token | Value | Usage |
|---|---|---|
| `--atca-navy` | `#1B2A4A` | Primary brand colour — sidebar bg, card headers, headings |
| `--atca-blue` | `#1F6BAE` | Interactive accent — links, active nav, primary buttons, focus ring |
| `--atca-gold` | `#C8922A` | Brand accent — active nav left-border, standalone topbar bottom-border |
| `--atca-light` | `#F4F6F9` | Page background, user-pill background |
| `--atca-white` | `#FFFFFF` | Card backgrounds, topbar background |
| `--atca-border` | `#DEE2E6` | All borders — cards, tables, inputs, topbar bottom |
| `--atca-text` | `#212529` | Body copy |
| `--atca-muted` | `#6C757D` | Labels, subtitles, breadcrumb, secondary text |

**Typography:** `Segoe UI`, system-ui, -apple-system — base `0.9rem`, body weight 400.

---

## 2. Layout System

The app has **three layout types**. Every page must use exactly one.

### Layout B — Standard Module (most pages)
```
┌─ #atca-sidebar (260px, fixed, navy) ─┬─ .atca-main (flex-col, margin-left 260px) ─┐
│  Brand                                │  #topbar (sticky, white, 1px border-bottom) │
│  Section labels                       │  .page-content (padding 1.5rem)             │
│  Nav links                            │    breadcrumb                                │
│  ...                                  │    KPI cards                                 │
│  Sidebar footer                       │    tables / cards / modals                   │
└───────────────────────────────────────┴──────────────────────────────────────────────┘
```
- Page ships `<nav id="atca-sidebar"></nav>` — `ATCA.sidebar.init()` injects the canonical nav HTML.
- All pages boot via `ATCA.initPage()`. **Never call init methods directly.**

### Layout A — Detail / sub-pages (NCR detail, CAPA detail)
Same as Layout B but the `<nav id="sidebar">` is hardcoded in the page. `init()` overwrites its innerHTML with the canonical nav. The hardcoded copy is legacy/fallback only.

### Layout D — Standalone modules (MOD-34, MOD-35, MOD-36)
```
┌─ #sidebar.atca-sidebar (sticky, navy) ─┬─ main content ─┐
│  Module-own tab navigation             │  ...            │
└────────────────────────────────────────┴─────────────────┘
```
- These modules own their own nav (no global sidebar injected). `init()` detects `.atca-sidebar` and skips injection.
- `#sidebar.atca-sidebar` CSS rule (id + class) re-asserts `position: sticky` over the global `#sidebar { position: fixed }`.

---

## 3. Sidebar Navigation

**Single source of truth:** `ATCA.sidebar._html` in `atca-core.js`. **Never edit individual page `<nav>` markup.**

| Property | Value |
|---|---|
| Width | `260px` |
| Background | `var(--atca-navy)` `#1B2A4A` |
| Position | `fixed`, `top: 0`, `left: 0`, `z-index: 1000` |
| Overflow | `auto` (scrollable on small screens) |

### Sidebar sub-elements

| Element | Style |
|---|---|
| **Brand block** | `padding: 1.25rem 1rem 0.75rem`; bottom `1px solid rgba(255,255,255,0.1)` |
| Brand title | White, `0.85rem`, weight 700, `letter-spacing: 0.03em` |
| Brand subtitle | `rgba(255,255,255,0.5)`, `0.7rem` |
| **Section label** | `0.65rem`, weight 700, uppercase, `letter-spacing: 0.08em`, `rgba(255,255,255,0.35)` |
| **Nav link (rest)** | `rgba(255,255,255,0.75)`, `0.83rem`, `border-left: 3px solid transparent`, `padding: 0.6rem 1rem` |
| **Nav link (hover)** | bg `rgba(255,255,255,0.08)`, text `#fff` |
| **Nav link (active)** | bg `var(--atca-blue)` `#1F6BAE`, text `#fff`, `border-left-color: var(--atca-gold)` |
| Nav icon | `18px` wide column, `0.9rem`, `opacity: 0.85` |
| **Footer** | `margin-top: auto`; `0.7rem`; `rgba(255,255,255,0.35)` |

Active link is determined by **longest href prefix match** against `window.location.pathname`.

---

## 4. Top Bar (`#topbar`)

Sticky white bar immediately below the sidebar (starts at the right of the sidebar).

| Property | Value |
|---|---|
| Background | `#FFFFFF` |
| Border | `1px solid var(--atca-border)` bottom |
| Padding | `0.6rem 1.5rem` |
| Position | `sticky top: 0`, `z-index: 500` |
| Layout | `flex`, `align-items: center`, `gap: 1rem` |

### Topbar anatomy (left → right)

1. **Sidebar toggle** `<button id="sidebar-toggle">` — `d-md-none` (mobile only), outline-secondary sm
2. **Title block**
   - `.topbar-title` — `1rem`, weight 600, `var(--atca-navy)` — module name + icon
   - `.topbar-subtitle` — `0.75rem`, `var(--atca-muted)` — compliance clause(s)
3. **`.topbar-alerts`** — `margin-left: auto`, flex, `gap: 0.75rem`
   - Optional module badge(s) (e.g. "1 Out of Stock" — populated by the module's JS into `#nav-alerts`)
   - **Bell icon** `#topbar-alert-btn` — `1.1rem`, muted; red badge overlay when alerts exist
   - **User pill** `#user-menu-btn` — rounded pill (`border-radius: 20px`), bg `var(--atca-light)`, 1px border
     - User avatar: `26×26px` circle, bg `var(--atca-blue)`, initials, `0.7rem` bold white
     - Display name: `0.78rem`

---

## 5. Cards

### `.atca-card`
```
background: #FFFFFF
border: 1px solid var(--atca-border)
border-radius: 6px
box-shadow: 0 1px 3px rgba(0,0,0,0.06)
margin-bottom: 1.25rem
```

### `.atca-card-header`
```
padding: 0.75rem 1.25rem
border-bottom: 1px solid var(--atca-border)
background: rgba(27,42,74,0.03)   ← very faint navy tint
display: flex; align-items: center; gap: 0.5rem
```
- `h5` inside: `0.88rem`, weight 700, `var(--atca-navy)`
- `.module-badge`: `0.65rem`, navy bg, white text, `border-radius: 3px`, `padding: 1px 5px`

### `.atca-card-body`
```
padding: 1.25rem
```

### `.atca-section-head` (sub-headings inside card bodies)
```
font-size: 0.78rem; font-weight: 700; color: var(--atca-navy)
border-bottom: 1px solid var(--atca-border); padding-bottom: 4px
margin-bottom: 0.6rem
```

---

## 6. KPI / Stat Cards

### `.kpi-card`
```
background: #FFFFFF
border: 1px solid var(--atca-border)
border-radius: 6px
padding: 1rem
border-left: 4px solid var(--atca-blue)   ← default
```
RAG variants override the left border colour:

| Class | Left border |
|---|---|
| `.rag-red` | `#DC3545` |
| `.rag-amber` | `#FFC107` |
| `.rag-green` | `#198754` |

| Sub-element | Style |
|---|---|
| `.kpi-label` | `0.7rem`, weight 600, uppercase, `letter-spacing: 0.06em`, muted |
| `.kpi-value` | `1.6rem`, weight 700, `var(--atca-navy)`, `line-height: 1` |
| `.kpi-sub` | `0.7rem`, muted |

Grid: `repeat(auto-fill, minmax(180px, 1fr))`, `gap: 1rem`.

---

## 7. RAG Status System

Used everywhere — inventory, documents, calibration, personnel, audits.

| Status | Colour | Hex | Meaning |
|---|---|---|---|
| RED | `var(--rag-red)` | `#DC3545` | Critical / overdue / out-of-stock |
| AMBER | `var(--rag-amber)` | `#FFC107` | Warning / approaching threshold |
| GREEN | `var(--rag-green)` | `#198754` | OK / adequate |

**RAG computation rules (inventory example):**
- `stock ≤ 0` or `stock ≤ critical_level` → RED
- `stock ≤ reorder_level` → AMBER
- Otherwise → GREEN

**Document expiry RAG:**
- `days < 0` → expired (RED)
- `0 ≤ days ≤ 30` → expiring soon (AMBER)
- `days > 30` → OK (GREEN)

**Days-to-expiry thresholds (general):** warn at 90 days, critical at 30 days (`ATCA.utils.ragFromDays`).

---

## 8. Status Badges

`.status-badge` — `display: inline-block`, `padding: 2px 8px`, `border-radius: 3px`, `0.68rem`, weight 700, uppercase, `letter-spacing: 0.04em`.

| Class | Background | Text colour | Usage |
|---|---|---|---|
| `.open` | `#FFF3CD` | `#856404` | Open / pending items |
| `.on-track` | `#D1E7DD` | `#0A3622` | On schedule |
| `.at-risk` | `#F8D7DA` | `#58151C` | Risk flagged |
| `.achieved` | `#D1E7DD` | `#0A3622` | Target met |
| `.closed` | `#E2E3E5` | `#41464B` | Resolved / archived |
| `.draft` | `#E2E3E5` | `#41464B` | Work in progress |
| `.approved` | `#D1E7DD` | `#0A3622` | Authorised |
| `.superseded` | `#E2E3E5` | `#6C757D` | Replaced by newer version |
| `.high` | `#F8D7DA` | `#58151C` | High severity / priority |
| `.medium` | `#FFF3CD` | `#856404` | Medium severity |
| `.low` | `#D1E7DD` | `#0A3622` | Low severity |

Bootstrap `bg-*` badges (e.g. `bg-danger`, `bg-warning text-dark`, `bg-success`, `bg-secondary`) are also used inline for dynamic content rendered via JS.

### Lot Expiry Status Badges (`.lot-badge`)

Used in MOD-14 lot tables — Lot Expiry tab, Item Lots modal, and "Next Lot Exp." register column. Separate from `.status-badge`: no uppercase, tighter padding, `white-space: nowrap`.

| Class | Background | Text | Trigger |
|---|---|---|---|
| `.lot-ok` | `#d1e7dd` | `#0a3622` | > 30 days remaining |
| `.lot-soon` | `#fff3cd` | `#664d03` | 0–30 days remaining |
| `.lot-over` | `#f8d7da` | `#58151c` | Expired (days < 0) |

```css
.lot-badge { display:inline-block; font-size:.7rem; font-weight:600; padding:1px 6px; border-radius:3px; white-space:nowrap; line-height:1.4; }
.lot-ok    { background:#d1e7dd; color:#0a3622; }
.lot-soon  { background:#fff3cd; color:#664d03; }
.lot-over  { background:#f8d7da; color:#58151c; }
```

---

## 9. Tables

### `.atca-table` (custom)
| Property | Value |
|---|---|
| Font size | `0.83rem` |
| Header bg | `var(--atca-navy)` — white text, weight 600, `0.75rem`, `padding: 0.55rem 0.75rem` |
| Row border | `1px solid var(--atca-border)` bottom |
| Row hover | bg `rgba(31,107,174,0.04)` — faint blue tint |
| Cell padding | `0.5rem 0.75rem` |

Bootstrap `.table.table-hover.table-sm.align-middle` is also used with `.table-dark` on `<thead>` — functionally equivalent.

**Action columns** are `text-end text-nowrap` with `btn btn-outline-* btn-sm` icon buttons:
- Pencil (`bi-pencil`) — Edit
- Folder (`bi-folder2-open`) — View documents
- Archive (`bi-archive`) — View lots / Item Lots modal (MOD-14 inventory rows)
- Download arrow (`bi-box-arrow-in-down`) — Quick receipt / action
- Calendar-plus (`bi-calendar-plus`) — Extend lot expiry (lot table rows)
- Trash (`bi-trash`) — Scrap lot (lot table rows)

---

## 10. Forms

| Element | Style |
|---|---|
| `.form-control`, `.form-select` | `0.83rem`; `border-color: var(--atca-border)` |
| Focus state | `border-color: var(--atca-blue)`; `box-shadow: 0 0 0 0.2rem rgba(31,107,174,0.15)` |
| `.atca-label` / `.form-label` | `0.78rem`, weight 600, `var(--atca-navy)` |
| Required marker | `<span class="text-danger">*</span>` inline after label text |
| Compliance clause | `.clause` — `0.65rem`, weight 400, muted, margin-left 6px |
| Section subheading | `.atca-section-head` (see §5) |
| Inline error | `<div class="alert alert-danger py-1 px-2 small">` — shown/hidden via `.d-none` |

Form sizes: use Bootstrap `form-control-sm` / `form-select-sm` inside modals and dense grids; full-size controls on wide detail cards.

---

## 11. Buttons

| Class | Background | Usage |
|---|---|---|
| `.btn-atca-primary` | `var(--atca-blue)` `#1F6BAE` | Primary save/confirm actions |
| `.btn-atca-navy` | `var(--atca-navy)` `#1B2A4A` | Secondary brand actions |
| `btn-primary` (Bootstrap) | Bootstrap blue | New item, primary CTA in modules |
| `btn-success` | Bootstrap green | Record/confirm positive action |
| `btn-secondary` | Bootstrap grey | Cancel / dismiss |
| `btn-outline-primary btn-sm` | Outlined blue | Edit (pencil) row action |
| `btn-outline-secondary btn-sm` | Outlined grey | Docs / view row action |
| `btn-outline-success btn-sm` | Outlined green | Quick receipt / positive row action |
| `btn-outline-danger btn-sm` | Outlined red | Delete / remove row action |

Compliance-linked buttons carry `data-compliance`, `data-linked`, and `data-action-desc` attributes for tooltip popovers.

---

## 12. Modals

Standard Bootstrap 5 modal with ATCA styling conventions:

| Part | Style |
|---|---|
| `.modal-header` | Default white; use `bg-warning` for session timeout; use `.atca-modal-header` (navy bg, white text) for critical actions |
| `.modal-title` | `0.88rem` – `1rem`, weight 600 |
| Body | Standard Bootstrap padding with `form-control-sm` fields |
| Footer | Always: Cancel (`btn-secondary btn-sm`) left, primary action (`btn-* btn-sm`) right |
| Size | `.modal-lg` for item/detail forms; `.modal-sm` for confirmations |

Every page includes a **Session Timeout Modal** (`#sessionTimeoutModal`) with a `#timeout-countdown` timer, "Stay Logged In", and "Log Out" options.

**Stacked modal pattern:** When a child modal (e.g. `#extendLotModal`, `#scrapLotModal`) is triggered from inside a parent modal (e.g. `#itemLotsModal`), call `parentModal.hide()` before showing the child. This avoids Bootstrap z-index conflicts and prevents `modal-backdrop` stacking. The child's save/cancel flow should reopen the parent if needed. Pattern used in MOD-14 lot workflows: `openScrapModal(itemId, lot, 'lots')` — the `'lots'` parameter signals that `itemLotsModal.hide()` must be called first.

---

## 13. Breadcrumb

`.atca-breadcrumb` — `0.75rem`, muted, `margin-bottom: 1rem`.
- Links: `var(--atca-blue)`, no underline
- Current page: `var(--atca-muted)` span
- Separator: ` / ` plain text

Pattern: `Home / Module Name / Record Ref`

---

## 14. Risk Score Badge

`.risk-score` — `32×32px`, `border-radius: 4px`, weight 700, `0.9rem`, white text.

| Class | Background | Range |
|---|---|---|
| `.high` | `var(--rag-red)` | score ≥ 15 |
| `.medium` | `var(--rag-amber)` | 8 ≤ score < 15 (dark text) |
| `.low` | `var(--rag-green)` | score < 8 |

---

## 15. Compliance Tooltips

Buttons with `data-compliance` attribute receive a Bootstrap popover on hover/focus:
- Custom class `.atca-compliance-tip`
- Body: `0.78rem`, `max-width: 280px`, `padding: 0.5rem 0.75rem`
- Border: `rgba(255,193,7,0.4)` — gold tint

---

## 16. Print Styles

On `@media print`:
- `#sidebar`, `#atca-sidebar`, `#topbar` → `display: none`
- `#main-content`, `.atca-main` → `margin-left: 0`
- `.page-content` → `padding: 0`
- `.atca-card` → `box-shadow: none; border: 1px solid #ccc`

---

## 17. Responsive (Mobile)

Breakpoint: `max-width: 768px`

- Sidebar hidden by default: `transform: translateX(-100%)`
- Sidebar opens on `.open` class: `transform: translateX(0)` — toggled by `#sidebar-toggle` button (`d-md-none`)
- `.atca-main` / `#main-content` → `margin-left: 0`
- KPI grid → `repeat(2, 1fr)`

---

## 18. Icon Set

**Bootstrap Icons** (`bi bi-*`) — loaded from `/assets/fonts/bootstrap-icons.css` (no CDN).

Common module icons:

| Icon | Usage |
|---|---|
| `bi-award` | QMS Core |
| `bi-folder2-open` | Document Control |
| `bi-exclamation-triangle` | NCR & CAPA |
| `bi-clipboard-check` | Audit Management |
| `bi-radioactive` | FPI Process |
| `bi-person-badge` | NDT Personnel / NAS410 |
| `bi-tools` | Equipment & Calibration |
| `bi-droplet` | Chemical / Bath Control |
| `bi-file-earmark-ruled` | Work Order / Traveler |
| `bi-file-earmark-check` | Certificate of Conformance |
| `bi-speedometer2` | KPI Dashboard |
| `bi-people` | User Management |
| `bi-box-seam` | Inventory |
| `bi-bell` | Alerts |
| `bi-pencil` | Edit action |
| `bi-trash` | Delete / scrap action |
| `bi-archive` | View lots (MOD-14 item rows) |
| `bi-calendar-plus` | Extend lot expiry |
| `bi-clock-history` | Lot Expiry tab nav |
| `bi-box-arrow-in-down` | Receipt / intake |
| `bi-plus-circle` / `bi-plus-lg` | Add new |
| `bi-arrow-repeat` | CAPA / corrective loop |

---

## 19. Page Scaffold Checklist

When building a new module page, verify:

- [ ] Correct layout type (`id="atca-sidebar"` for Layout B, hardcoded `id="sidebar"` for Layout A, own nav + `.atca-sidebar` for Layout D)
- [ ] `#topbar` with sidebar toggle, `.topbar-title` (icon + name), `.topbar-subtitle` (AS9100D clause), `.topbar-alerts` (bell + user pill)
- [ ] `<main class="page-content">` wrapping all content
- [ ] `.atca-breadcrumb` at the top of page content
- [ ] Session Timeout Modal (`#sessionTimeoutModal`) before `</body>`
- [ ] Scripts in order: `bootstrap.bundle.min.js` → `atca-demo.js?v=N` → `atca-core.js?v=7`
- [ ] Boot: `ATCA.initPage()` — never call sidebar/auth/alert init directly
- [ ] Compliance data attributes on write actions: `data-compliance`, `data-linked`, `data-action-desc`
- [ ] All user-supplied strings passed through `ATCA.utils.escHtml()` before innerHTML
- [ ] Files saved as **UTF-8 without BOM** — never use PowerShell `Set-Content -Encoding utf8`

---

## 20. Cross-Module Patterns

### Approval Queue (`atca_pending_approvals`)

The shared localStorage key `atca_pending_approvals` is the bridge for multi-step approval workflows between modules. Any module that submits a request writes to this key; `user-dashboard.html` reads and acts on it; effects are written back to the originating module's data.

| Field | MOD-14 usage |
|---|---|
| `approval_id` | `apr_` + Date.now() |
| `module` | `'MOD-14'` |
| `movement_type` | `'RECEIPT'` / `'DISPOSAL'` / `'LOT_EXTENSION'` |
| `status` | `'PENDING'` → `'APPROVED'` / `'REJECTED'` |
| `item_id`, `item_code` | identifies the inventory item |
| `lot_number` | links to specific lot |
| `lot_expiry` | ISO date (on RECEIPT; updated in-place by applyLotExtension) |
| `evidence_data` | base64 data URL (LOT_EXTENSION only) |

**Pattern rules:**
- Pending check: test `atca_pending_approvals` filtered by module + type + item + lot + status=PENDING before rendering an action button — show "Pending" badge instead.
- In-place update: `applyLotExtension()` mutates `lot_expiry` directly on the matching APPROVED RECEIPT record in `atca_pending_approvals` (the lot data lives in the approval record, not a separate table).
- Seed data: when no APPROVED RECEIPT records exist for a module (fresh demo), call a `_seedDemoXxx()` function to insert realistic seed lots/data on first `init()`, guarded by a localStorage flag.

### Demo Seed Pattern

When a feature depends on data that only exists after upstream approval workflows complete (e.g. lot data requiring approved RECEIPTs), seed realistic demo data on first page load:

```js
function _seedDemoLots() {
  const existing = loadApprovals().filter(a => a.module === 'MOD-14' && a.movement_type === 'RECEIPT');
  if (existing.length) return;   // already seeded
  // push APPROVED RECEIPT records with realistic expiry dates
}
```

Guard with the `existing.length` check so seed runs only once.

---

## 21. Colour Quick Reference

```
Navy   #1B2A4A  ████  Sidebar bg, headers, titles
Blue   #1F6BAE  ████  Active nav, links, primary buttons, focus
Gold   #C8922A  ████  Active nav border, standalone topbar accent
Light  #F4F6F9  ████  Page background
White  #FFFFFF  ████  Cards, topbar
Border #DEE2E6  ████  All structural borders
Text   #212529  ████  Body copy
Muted  #6C757D  ████  Secondary text, labels

RED    #DC3545  ████  RAG critical, danger badges
AMBER  #FFC107  ████  RAG warning, session timeout header
GREEN  #198754  ████  RAG OK, success actions
```
