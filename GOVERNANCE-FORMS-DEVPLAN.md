# Forms, Records & Approval Governance — Development Plan

**ATCA-ERP v1.0 | ATC Aviation Pte Ltd**
**Authored:** 2026-06-30 | **Status:** 📋 PLANNED — ready for build
**Audience:** the Sonnet build agent. This document is self-contained; build from it directly.
**Compliance:** AS9100D §7.5 (Documented Information), §7.5.3 (Control of Documented Information), §8.5.6 (Control of Changes), §8.6 (Release of Products); NADCAP frozen-process / change-control.

---

## 0. How to use this plan

This plan implements **four governance requirements** that cut across every module. Build them as **shared services in `atca-core.js`** plus **one new console module (MOD-39)** — not as per-module copies. The four requirements are:

| # | Requirement | Primary mechanism | Build section |
|---|---|---|---|
| 1 | The **default approval user is the Quality Manager (QM)**. | `ATCA.approvals.defaultApprover()` resolves the QM and routes every final approval to them. | §2 |
| 2 | Any **form** (a popup or a collection of fields the user fills) that is filled and signed off becomes a **record**. Records live in the **File Repository (MOD-37)** and are **withdrawable** by other modules. Every form is **signed by the raiser → verified by their direct superior → accepted by the QM** (3-step chain). | `ATCA.forms` service + `ATCA.records` index + 3-step sign-off state machine. | §3, §4 |
| 2b | **All module approval flows are presented and tied into the Value Flow Diagram module (MOD-27).** | `ATCA.approvalFlows` registry → new "Approval Flow Map" view in MOD-27. | §5 |
| 3 | Any **change to a form's format** needs QM approval. In deployed mode a small **"Request for Revision"** button sits beside each form/document number. The change is made in Claude, recorded in the **revision-history form**, and **QM-approved before deploy**. | `ATCA.revision` service + revision register in MOD-39. | §6 |
| 4 | All changes run in an **isolated trial environment** before deploy; the trial environment is accessible **only by QM and ADMIN**. | `ATCA.env` namespaced storage + TRIAL banner + branch/preview-deploy strategy. | §7 |

**Reuse, do not reinvent.** These exist already and must be the foundation:

- `atca_pending_approvals` (localStorage) — the cross-module approval queue. Submitter modules push items; `user-dashboard.html` (`approveItem()` / `rejectItem()`) applies them. Items carry `module`, `movement_type`, `reference_id`, `status`, `form_version`. See `user-dashboard.html:143–340`.
- `ATCA.fileStore` (`atca-core.js:850–937`) — `put(meta,dataUrl)→FILE-NNNN`, `get`, `list({module,entity_id,file_tag})`, `open`, `remove`, `summary`. File tags already include `COC/EVIDENCE/MSDS/CALIBRATION/AUDIT/PERMIT/TRAINING/DOCUMENT`. **Add a `RECORD` tag.**
- `atca_form_id_seq` + `nextFormId()` → `FM-NNN` (DEVELOPMENT-STANDARDS.md Rule 2).
- The DRAFT→PENDING_QM→APPROVED/REJECTED state machine (DEVELOPMENT-STANDARDS.md Rule 3), already wired for MOD-11 PM checklists via `movement_type:'FORM_APPROVAL'`.
- MOD-31 PIN sign-off (`/mod31/signoff`) — the non-repudiable electronic signature. Use it for each of the 3 sign-off steps.
- MOD-18 org chart (`reports_to` on staff) — resolves a user's **direct superior**.
- MOD-27 Value Flow Tracker — the `.vf-stage--{pending,active,waiting,complete,blocked}` CSS and diagram pattern (MOD27-DEVPLAN.md §5.2). Reuse it for the Approval Flow Map.

---

## 1. Data model summary (localStorage keys)

| Key | Owner | Purpose | New? |
|---|---|---|---|
| `atca_org_config` | `ATCA.approvals` | `{ default_qm_user_id, default_qm_name }` + per-module approver overrides | **NEW** |
| `atca_forms` | `ATCA.forms` | All form instances (filled field-sets + sign-off chain + status) | **NEW** |
| `atca_form_defs` | `ATCA.forms` | Form **definitions** (templates: which fields, current format version) | **NEW** |
| `atca_records` | `ATCA.records` | Accepted forms promoted to records (index: record_id → form_id, file_id, module, entity) | **NEW** |
| `atca_revisions` | `ATCA.revision` | Revision-request register for form-format changes | **NEW** |
| `atca_env_mode` | `ATCA.env` | `'PRODUCTION'` or `'TRIAL'` (QM/ADMIN only) | **NEW** |
| `atca_pending_approvals` | shared | Existing approval queue — extended with new `movement_type` values | extend |
| `atca_file_store` | `ATCA.fileStore` | Existing file repo — add `RECORD` file_tag | extend |
| `atca_audit_log` | shared | Existing audit trail (Rule 1) — every transition logs here | extend |
| `atca_form_id_seq` | shared | Existing FM-NNN sequence | reuse |

In TRIAL mode (§7) every key above is read/written under a `trial__` prefix so production data is never touched.

---

## 2. Requirement 1 — Quality Manager is the default approver

### 2.1 Resolve the QM

Add `ATCA.approvals` to `atca-core.js`:

```js
ATCA.approvals = {
  _CFG: 'atca_org_config',

  _config() {
    try { return JSON.parse(localStorage.getItem(this._CFG) || '{}'); } catch { return {}; }
  },
  _saveConfig(c) { localStorage.setItem(this._CFG, JSON.stringify(c)); },

  /** Resolve the default approver (Quality Manager). Falls back to the first QA_MANAGER user. */
  async defaultApprover() {
    const cfg = this._config();
    if (cfg.default_qm_user_id) return { user_id: cfg.default_qm_user_id, name: cfg.default_qm_name, role: 'QA_MANAGER' };
    // resolve from the user register
    let users = [];
    try { users = (await ATCA.api.get('/mod25/users')).items || []; } catch {}
    const qm = users.find(u => u.role === 'QA_MANAGER' && u.is_active !== false);
    if (qm) return { user_id: qm.user_id, name: qm.full_name, role: 'QA_MANAGER' };
    return { user_id: null, name: 'Quality Manager', role: 'QA_MANAGER' };   // demo fallback
  },

  /** Whoever is the final approver for a given module (override → QM). */
  async approverForModule(moduleId) {
    const cfg = this._config();
    if (cfg.overrides && cfg.overrides[moduleId]) return cfg.overrides[moduleId];
    return this.defaultApprover();
  },
};
```

### 2.2 Make QM the default everywhere

- Every push to `atca_pending_approvals` sets `final_approver_role: 'QA_MANAGER'` and `final_approver_id` (from `defaultApprover()`).
- `user-dashboard.html` already gates approve/reject; tighten it so the **Accept** action (final step) is enabled only when `ATCA.currentUser.role` is `QA_MANAGER` or `ADMIN`. Intermediate "Verify" steps (§3) are enabled for the raiser's direct superior.
- MOD-25 gets a **"Default Approver"** setting: a dropdown of QA_MANAGER users written to `atca_org_config.default_qm_user_id`. ADMIN-only.

**Audit:** log `STATUS_CHANGE` with `action:'SET_DEFAULT_APPROVER'` when changed.

---

## 3. Requirement 2 — the universal Form → Record lifecycle

### 3.1 What is a "form"?

> Any popup, modal, or collection of fields a user fills in. When it is filled **and signed off**, it becomes a **record**.

Today each module hand-rolls its modals. This plan introduces a thin, **opt-in** wrapper so any modal can register the data it captured as a controlled form, without rewriting the module UI.

### 3.2 `ATCA.forms` service (atca-core.js)

```js
ATCA.forms = {
  _F:   'atca_forms',
  _DEF: 'atca_form_defs',

  _load()  { try { return JSON.parse(localStorage.getItem(this._F)   || '[]'); } catch { return []; } },
  _save(a) { localStorage.setItem(this._F, JSON.stringify(a)); },

  /**
   * Create a form instance from a filled field-set.
   * @param {Object} o { form_def_id, module, entity_type, entity_id, title, fields:{...}, raised_by }
   * @returns the new form record (status DRAFT, FM-NNN assigned)
   */
  raise(o) {
    const forms = this._load();
    const rec = {
      form_id:    ATCA.nextFormId ? ATCA.nextFormId() : nextFormId(),  // FM-NNN
      form_def_id: o.form_def_id || null,
      module:     o.module,
      entity_type: o.entity_type || '',
      entity_id:  o.entity_id || '',
      title:      o.title || 'Form',
      fields:     o.fields || {},
      form_version: 1,
      status:     'DRAFT',
      // 3-step sign-off chain
      raised_by:   o.raised_by || ATCA.currentUser?.full_name, raised_at: null, raised_sign: null,
      verified_by: null, verified_at: null, verified_sign: null,
      accepted_by: null, accepted_at: null, accepted_sign: null,
      reject_reason: null, record_id: null, file_id: null,
      created_at: new Date().toISOString(),
    };
    forms.push(rec); this._save(forms);
    ATCA.audit?.log('CREATE', o.module, 'atca_forms', rec.form_id, null, rec);
    return rec;
  },

  get(formId)  { return this._load().find(f => f.form_id === formId) || null; },
  list(filter) { let a = this._load(); if (filter) Object.entries(filter).forEach(([k,v]) => a = a.filter(f => f[k]===v)); return a; },
  _update(formId, patch) {
    const a = this._load(); const f = a.find(x => x.form_id === formId); if (!f) return null;
    Object.assign(f, patch); this._save(a); return f;
  },
};
```

### 3.3 The 3-step sign-off state machine

> *"all forms raised shall be signed off by the person who raised the form, verified by their direct superior, and finally accepted by the QM."*

```
            ┌──────────────────── reject (reason) ───────────────────┐
            ▼                                                          │
  ┌───────┐  raiser signs    ┌────────────────┐  superior verifies  ┌──────────┐  QM accepts   ┌──────────┐
  │ DRAFT │ ───────────────► │ PENDING_VERIFY │ ──────────────────► │ PENDING_ │ ────────────► │ ACCEPTED │
  │       │   (PIN sign)     │                │     (PIN sign)      │   QM     │  (PIN sign)   │ = RECORD │
  └───────┘                  └────────────────┘                     └──────────┘               └──────────┘
       ▲                            │ reject                              │ reject
       └────────────────────────────┴─────────────────────────────────────┘
```

Stage owners:

| Stage | Status entering | Who acts | Action | Resulting status |
|---|---|---|---|---|
| 1 Raise & self-sign | `DRAFT` | raiser | PIN sign-off (MOD-31) | `PENDING_VERIFY` |
| 2 Verify | `PENDING_VERIFY` | raiser's **direct superior** (MOD-18 `reports_to`) | PIN sign-off / reject | `PENDING_QM` / `DRAFT` |
| 3 Accept | `PENDING_QM` | **QM** (`defaultApprover()`) | PIN sign-off / reject | `ACCEPTED` / `DRAFT` |

Service methods:

```js
ATCA.forms.sign     = function(formId, pinSig)            { /* DRAFT → PENDING_VERIFY; set raised_sign/at; push verify task to approvals queue routed to superior */ };
ATCA.forms.verify   = function(formId, pinSig)            { /* PENDING_VERIFY → PENDING_QM; set verified_*; re-route to QM */ };
ATCA.forms.accept   = function(formId, pinSig)            { /* PENDING_QM → ACCEPTED; set accepted_*; THEN call ATCA.records.promote(formId) */ };
ATCA.forms.reject   = function(formId, reason, atStage)   { /* → DRAFT; set reject_reason; notify raiser */ };
```

Each transition:
1. Validates the actor's role/identity (raiser, superior, or QM).
2. Captures a **MOD-31 PIN signature** (`POST /mod31/signoff`) and stores its token in `*_sign`.
3. Writes an **audit-log** entry (Rule 1).
4. Updates `atca_pending_approvals` so the next actor sees the task on their dashboard.
5. Pushes a dashboard **notification** (`atca_notifications`) to the next actor.

**Direct-superior resolution** (helper in `ATCA.forms`):

```js
ATCA.forms.superiorOf = async function(userName) {
  let staff = [];
  try { staff = (await ATCA.api.get('/mod18/staff')).items || []; } catch {}
  const me  = staff.find(s => s.full_name === userName);
  const sup = me && staff.find(s => s.staff_id === me.reports_to);
  return sup ? { name: sup.full_name, user_id: sup.user_id } : null;   // null → escalate straight to QM
};
```

### 3.4 Approval-queue wiring (extend, do not replace)

Add three `movement_type` values to the existing queue and branch them in `user-dashboard.html`:

| `movement_type` | Stage | Approver role gate | Applies via |
|---|---|---|---|
| `FORM_VERIFY` | superior verify | raiser's `reports_to` (or SUPERVISOR+) | `ATCA.forms.verify()` |
| `FORM_ACCEPT` | QM accept | `QA_MANAGER` / `ADMIN` | `ATCA.forms.accept()` |
| `FORM_REVISION_REQUEST` | format change (§6) | `QA_MANAGER` / `ADMIN` | `ATCA.revision.approve()` |

In `user-dashboard.html`:
- Extend `TYPE_COLOR` / `TYPE_ICON` / `MOD_LABEL` maps (`user-dashboard.html:196–198`).
- Extend `approveItem()` / `rejectItem()` (`:293–340`) with a branch for each new type, mirroring the existing `applyFormApproval()` pattern (`:182–193`).
- Card rendering (`extraDetails()`, `:200+`) shows the sign-off chain so the approver sees who raised/verified.

---

## 4. Requirement 2 — Records repository (File Repository integration)

### 4.1 Promote an accepted form to a record

When `ATCA.forms.accept()` reaches `ACCEPTED`, the form is frozen into a **record**:

```js
ATCA.records = {
  _R: 'atca_records',
  _load()  { try { return JSON.parse(localStorage.getItem(this._R) || '[]'); } catch { return []; } },
  _save(a) { localStorage.setItem(this._R, JSON.stringify(a)); },

  /** Render an ACCEPTED form to an immutable snapshot, store it in the File Repository, index it. */
  promote(formId) {
    const f = ATCA.forms.get(formId);
    if (!f || f.status !== 'ACCEPTED') return null;
    const html    = ATCA.records._renderSnapshot(f);            // form fields + 3 signatures + FM/version/status badges
    const dataUrl = 'data:text/html;base64,' + btoa(unescape(encodeURIComponent(html)));
    const fileId  = ATCA.fileStore.put({
      module: f.module, entity_type: f.entity_type, entity_id: f.entity_id,
      filename: `${f.form_id}_v${f.form_version}_${f.title}.html`,
      mime_type: 'text/html', size_bytes: dataUrl.length,
      file_tag: 'RECORD', uploaded_by: f.accepted_by,
    }, dataUrl);
    const rec = {
      record_id: 'REC-' + new Date().getFullYear() + '-' + String(ATCA.records._load().length + 1).padStart(4,'0'),
      form_id: f.form_id, form_version: f.form_version, file_id: fileId,
      module: f.module, entity_type: f.entity_type, entity_id: f.entity_id,
      title: f.title, accepted_by: f.accepted_by, accepted_at: f.accepted_at,
    };
    const a = ATCA.records._load(); a.push(rec); ATCA.records._save(a);
    ATCA.forms._update(formId, { record_id: rec.record_id, file_id: fileId });
    ATCA.audit?.log('CREATE', f.module, 'atca_records', rec.record_id, null, rec);
    return rec;
  },

  /** Withdraw (reference) records from any other module. */
  withdraw(filter) { let a = ATCA.records._load(); if (filter) Object.entries(filter).forEach(([k,v]) => a = a.filter(r => r[k]===v)); return a; },
  open(recordId)   { const r = ATCA.records._load().find(x => x.record_id===recordId); if (r) ATCA.fileStore.open(r.file_id); },
};
```

`_renderSnapshot(f)` builds a printable HTML record showing: the `[FM-NNN] [v#] [ACCEPTED]` badge row, every field/value, and the three signatures (raiser, superior, QM) with names + timestamps + PIN tokens. This is the "record" that satisfies AS9100D §7.5.3 retention.

### 4.2 Records are withdrawable cross-module

Other modules reference accepted records two ways:
1. **By file tag** — `ATCA.fileStore.list({ file_tag:'RECORD', module:'MOD-08' })`.
2. **By the records index** — `ATCA.records.withdraw({ entity_id:'WO-2026-0019' })` returns every accepted form for that job, regardless of which module raised it.

MOD-37 File Repository gets a new **"Records"** filter chip (`file_tag === 'RECORD'`) so the whole record set is browsable in one place. Add a "Withdraw / Attach to current job" affordance described in MOD-37's tab.

### 4.3 Records are immutable

- Once `ACCEPTED`, a form cannot be edited. To change it you raise a **new revision** (§6) which produces `form_version + 1` and a fresh record; the prior record stays in the repository (full revision history).
- `ATCA.fileStore.remove()` must be blocked for `file_tag:'RECORD'` unless `ADMIN` + an audit reason.

---

## 5. Requirement 2b — surface every approval flow in MOD-27 Value Flow

### 5.1 The approval-flow registry

Add to `atca-core.js` a declarative registry of every module's approval flow. The **default** is the universal 3-step form flow; modules with bespoke flows (CoC, ECN, NCR, Payroll…) declare their own stages.

```js
ATCA.approvalFlows = {
  DEFAULT: { name: 'Controlled Form', stages: ['DRAFT','PENDING_VERIFY','PENDING_QM','ACCEPTED'] },
  byModule: {
    'MOD-08': { name: 'Audit Plan',      stages: ['DRAFT','PENDING_VERIFY','PENDING_QM','ACCEPTED'] },
    'MOD-11': { name: 'PM Checklist',    stages: ['DRAFT','PENDING_QM','APPROVED'] },            // existing FORM_APPROVAL
    'MOD-24': { name: 'CoC',             stages: ['DRAFT','ISSUED','VOID'] },
    'MOD-33': { name: 'ECN',             stages: ['DRAFT','PENDING_REVIEW','PENDING_CUSTOMER','CUSTOMER_APPROVED','APPROVED','IMPLEMENTED'] },
    'MOD-07': { name: 'NCR / CAPA',      stages: ['OPEN','MRB_DISPOSITION','CAPA','VERIFY','CLOSED'] },
    'MOD-23': { name: 'Payroll Run',     stages: ['DRAFT','APPROVED(QM)','DISBURSED(ADMIN)'] },
    // …one entry per module that owns an approval flow
  },
  for(moduleId) { return this.byModule[moduleId] || this.DEFAULT; },
};
```

> Build note: populate `byModule` by walking each module's known state machine (most are recorded in `memory/project-overview.md` and DEVELOPMENT-STANDARDS.md). Every module that raises a controlled form should appear.

### 5.2 New MOD-27 view: "Approval Flow Map"

Add a second tab/section to `modules/mod27-value-flow/index.html` (it is currently a single GRN-pipeline view):

- **Tab 1 — Job Value Flow** (existing 8-stage GRN pipeline; unchanged).
- **Tab 2 — Approval Flow Map** (NEW): for each entry in `ATCA.approvalFlows.byModule`, render a horizontal mini value-flow diagram reusing the `.vf-stage` nodes and `.vf-arrow` connectors. Each stage node shows a **live count** of items currently at that stage, read from:
  - `ATCA.forms.list({ module })` grouped by `status`, plus
  - `atca_pending_approvals` filtered by `module`, plus
  - module-native counts where available (e.g. `/mod33/alerts/summary.ecn_pending`).
- Clicking a stage node deep-links to the owning module (reuse `data-href`).
- A legend maps node colour to state (`pending/active/waiting/complete/blocked` — same CSS).

This makes "all the approval flows for each module presented and tied into the value-flow module" literally true: one screen shows every module's flow and where work is stuck.

### 5.3 Preview stubs

No backend needed — counts come from localStorage. Add a `tools/approval_flows_demo.json` only if you want seeded counts; otherwise the live `atca_forms` data drives it.

---

## 6. Requirement 3 — form-format change control (Request for Revision)

### 6.1 The button

Beside **every** `[FM-NNN] [v#]` badge, inject a small **"Request for Revision"** button. Make it a one-liner any page can call:

```js
// Returns an HTML string; place it right after the form-number badge.
ATCA.revision.button = function(formId, version) {
  return `<button class="btn btn-sm btn-outline-warning cl-revreq-btn"
            title="Request a change to this form's format (QM approval required)"
            onclick="ATCA.revision.open('${formId}', ${version})">
            <i class="bi bi-pencil-square"></i> Request Revision
          </button>`;
};
```

`ATCA.revision.open()` shows a modal capturing:

| Field | Notes |
|---|---|
| Form / Document No. | pre-filled (`FM-NNN`) |
| Current version | pre-filled (`v#`) |
| Reason for change | required |
| Proposed change (format/fields) | required — what should be added/removed/relabelled |
| Requested by | current user |
| Priority | LOW / NORMAL / HIGH |

On submit it:
1. Creates an `atca_revisions` entry (status `DRAFT`).
2. Pushes a `FORM_REVISION_REQUEST` to `atca_pending_approvals` routed to the **QM**.
3. Audit-logs the request.

### 6.2 Revision register + state machine

```
DRAFT → PENDING_QM → APPROVED → IN_DEVELOPMENT → READY_FOR_DEPLOY → DEPLOYED
                        │ reject
                        ▼
                     REJECTED (reason)
```

| Status | Meaning | Who advances |
|---|---|---|
| `DRAFT` | request raised | auto |
| `PENDING_QM` | awaiting QM approval | QM accepts/rejects |
| `APPROVED` | QM approved the *intent*; change may be built | QM |
| `IN_DEVELOPMENT` | the format change is being made **in Claude** | ADMIN/dev marks |
| `READY_FOR_DEPLOY` | built + validated in the **TRIAL** environment (§7) | QM signs off after trial review |
| `DEPLOYED` | merged to production; `form_def` version bumped | ADMIN |

Each approved revision, once deployed, increments the relevant `atca_form_defs[].format_version` and is appended to that form definition's **revision history** (per DEVELOPMENT-STANDARDS Rule 3 — full immutable history with `change_summary` + snapshot).

```js
ATCA.revision = {
  _K: 'atca_revisions',
  open(formId, version) { /* show modal */ },
  submit(o)             { /* create DRAFT, push FORM_REVISION_REQUEST to QM, audit */ },
  approve(revId, qmSig) { /* PENDING_QM → APPROVED; PIN sign; audit */ },
  reject(revId, reason) { /* → REJECTED */ },
  markBuilt(revId)      { /* APPROVED → IN_DEVELOPMENT → READY_FOR_DEPLOY (after trial) */ },
  deploy(revId)         { /* READY_FOR_DEPLOY → DEPLOYED; bump form_def format_version + append revision history */ },
};
```

### 6.3 Deployed-mode vs demo-mode

- In **demo/preview** the button always shows and the workflow runs entirely in localStorage.
- In **deployed** mode the same button appears; the *actual code change* to the form's HTML/JS is performed in Claude (this is explicit in the requirement). The revision register is the human-facing control record that gates that code change: **no form-format code change ships without an `APPROVED` (and ultimately `DEPLOYED`) revision entry, QM-signed.** Wire a deploy-time check (documented in §7.4) that refuses to promote a build to production if any `READY_FOR_DEPLOY` revision lacks QM sign-off.

---

## 7. Requirement 4 — isolated trial environment (QM + ADMIN only)

### 7.1 Two layers

**Layer A — in-app TRIAL data sandbox (build this now).**
`ATCA.env` switches all governance storage between a production namespace and a `trial__`-prefixed namespace.

```js
ATCA.env = {
  _K: 'atca_env_mode',
  mode()        { return localStorage.getItem(this._K) || 'PRODUCTION'; },
  isTrial()     { return this.mode() === 'TRIAL'; },
  canSwitch()   { return ['QA_MANAGER','ADMIN'].includes(ATCA.currentUser?.role); },
  set(mode) {
    if (!this.canSwitch()) { ATCA.toast('Only QM or ADMIN may switch environment.', 'danger'); return; }
    localStorage.setItem(this._K, mode);
    ATCA.audit?.log('STATUS_CHANGE', 'SYSTEM', 'atca_env_mode', mode, null, { mode });
    window.location.reload();
  },
  /** Namespaced key: in TRIAL mode every governance key is read/written under trial__ */
  key(baseKey) { return this.isTrial() ? 'trial__' + baseKey : baseKey; },
};
```

Route every governance `localStorage.getItem/setItem` (forms, records, revisions, approvals, file store) through `ATCA.env.key(...)`. Effect: QM/ADMIN flip to TRIAL, exercise a new/changed form end-to-end against a **copy** of data, and production records are untouched.

- **Visible banner** when `isTrial()`: a fixed top strip "🧪 TRIAL ENVIRONMENT — changes here do not affect production records." (amber).
- **"Seed trial from production"** action (copies current production governance keys into `trial__*`) and **"Reset trial"** (clears `trial__*`). Both ADMIN-gated, audit-logged.
- Non-QM/ADMIN users never see the switch and are pinned to `PRODUCTION`.

**Layer B — real isolated preview deploy (process, documented in §7.4).**
Because production runs on Vercel static hosting, the genuine "isolated environment before deploy" is a **branch + preview-URL** workflow:

1. Changes (including QM-approved form-format revisions) are built in Claude on a `trial` branch.
2. Push `trial` → Vercel builds an **isolated preview deployment** with its own URL.
3. Restrict that preview URL to QM + ADMIN (Vercel password protection / deployment protection, or a shared access token).
4. QM reviews on the preview URL; signs off the matching `atca_revisions` entry → `READY_FOR_DEPLOY`.
5. Only then merge `trial` → `main`; the production deploy proceeds.

### 7.2 MOD-39 console — where all of this lives

Create **MOD-39 "Forms, Records & Change Control"** (`src/frontend/modules/mod39-governance/index.html`, Layout C navbar like the other late modules). Tabs:

| Tab | Contents |
|---|---|
| **Form Register** | All `atca_forms` with FM-NNN, version, status badge, sign-off chain, filter by module/status. Raise/Sign/Verify/Accept actions per role. |
| **Records** | All `atca_records` (accepted forms) — link opens the File Repository snapshot; "Withdraw to job" affordance. |
| **Revision Register** | All `atca_revisions` with the §6.2 state machine; QM approve/reject; deploy controls (ADMIN). |
| **Approval Flow Map** | Mirror of the MOD-27 Tab 2 (or a link to it) for convenience. |
| **Trial Environment** | `ATCA.env` switch (QM/ADMIN only), TRIAL banner status, Seed/Reset trial, deploy checklist. |

Add MOD-39 to the **System** group of the sidebar (`ATCA.sidebar._html`) and a home-page System card. Gate the page: `READONLY+` can view Form Register/Records; only `SUPERVISOR+` verify; only `QA_MANAGER/ADMIN` accept, approve revisions, or switch environment.

### 7.3 RBAC summary

| Action | Min role |
|---|---|
| Raise a form, self-sign | the raiser (any operational role) |
| Verify a form | raiser's direct superior (resolved via MOD-18; SUPERVISOR+ fallback) |
| Accept a form (final) | `QA_MANAGER` (or `ADMIN`) |
| Approve a revision request | `QA_MANAGER` (or `ADMIN`) |
| Switch to TRIAL / Seed / Reset | `QA_MANAGER` or `ADMIN` |
| Deploy a revision / Promote to production | `ADMIN` (after QM `READY_FOR_DEPLOY` sign-off) |
| Set default approver | `ADMIN` |

### 7.4 Deploy gate (documented procedure)

Add to DEVELOPMENT-STANDARDS.md and to the §7.5 deploy checklist: **a build may be promoted to production only if** (a) every form-format code change has a matching `atca_revisions` entry that is `APPROVED` by QM, and (b) that entry has been validated in the trial preview and signed `READY_FOR_DEPLOY`. This is a manual gate enforced by the human + QM; the revision register is the evidence.

---

## 8. Files to create / modify

### New files
| File | Description |
|---|---|
| `src/frontend/modules/mod39-governance/index.html` | MOD-39 console (Form Register, Records, Revision Register, Approval Flow Map, Trial Env) |
| `tools/governance_demo.json` *(optional)* | Seed forms/records/revisions for preview |

### Modified files
| File | Change |
|---|---|
| `src/frontend/assets/js/atca-core.js` | Add `ATCA.approvals`, `ATCA.forms`, `ATCA.records`, `ATCA.revision`, `ATCA.env`, `ATCA.approvalFlows`, `ATCA.audit` (central helper); route governance storage through `ATCA.env.key()`; bump `?v=` cache-bust across all HTML |
| `src/frontend/user-dashboard.html` | Branch `approveItem()`/`rejectItem()` for `FORM_VERIFY`, `FORM_ACCEPT`, `FORM_REVISION_REQUEST`; extend `TYPE_COLOR/TYPE_ICON/MOD_LABEL`; render sign-off chain in cards |
| `src/frontend/modules/mod27-value-flow/index.html` | Add Tab 2 "Approval Flow Map" rendering `ATCA.approvalFlows` with live counts |
| `src/frontend/modules/mod37-file-repository/index.html` | Add `RECORD` filter chip + "Withdraw to job" affordance |
| `src/frontend/modules/mod25-user-management/index.html` | Add "Default Approver" setting (writes `atca_org_config.default_qm_user_id`) |
| `src/frontend/index.html` | Add MOD-39 card to System grid |
| `preview_server.py` | Stubs for any new endpoints (`/mod39/*` if added); ensure `/mod25/users`, `/mod18/staff`, `/mod31/signoff` return demo data the services can consume |
| `DEVELOPMENT-STANDARDS.md` | Add Rules 4–7 (default QM approver, 3-step sign-off, forms→records, revision/trial gates) — already drafted in this plan |
| `USER-MANUAL.md` | New sections: §18 Forms & Records, §19 Revision Control, §20 Trial Environment |
| `ROADMAP.md` | Add **Phase 14 — Governance & Change Control** |
| `README.md` | Add MOD-39 to module table; link this dev plan |
| `TEST-PLAN.md` | Add §3.x MOD-39 + governance test cases (below) |
| `memory/project-overview.md` | Register MOD-39 + governance services |

---

## 9. Implementation sequence

| Step | Task | Est |
|---|---|---|
| 1 | `ATCA.audit` central helper + route all governance writes through it | 1h |
| 2 | `ATCA.approvals.defaultApprover()` + MOD-25 default-approver setting | 1.5h |
| 3 | `ATCA.forms` service + 3-step state machine + superior resolution | 3h |
| 4 | `ATCA.records.promote/withdraw` + File Repo `RECORD` tag + snapshot renderer | 2.5h |
| 5 | `user-dashboard.html` queue branches (FORM_VERIFY/ACCEPT) + card sign-off chain | 2h |
| 6 | `ATCA.approvalFlows` registry + MOD-27 Tab 2 Approval Flow Map | 3h |
| 7 | `ATCA.revision` service + Request-for-Revision button + revision register | 3h |
| 8 | `ATCA.env` trial sandbox + banner + seed/reset + namespacing | 2.5h |
| 9 | MOD-39 console page (5 tabs) + sidebar + home card | 4h |
| 10 | Preview stubs, demo seed, cache-bust, docs (.md updates) | 2h |
| 11 | Preview-verify end-to-end (raise→verify→accept→record→withdraw; revision→trial→deploy) | 2h |
| **Total** | | **~26.5h** |

**Build order rationale:** services first (steps 1–4) because everything else consumes them; dashboard + MOD-27 (5–6) make the flows visible; revision + trial (7–8) layer change-control on top; MOD-39 (9) is the console that ties it together.

---

## 10. Test cases

| ID | Test | Pass criteria |
|---|---|---|
| T-GV-01 | Raise a form via `ATCA.forms.raise()` | FM-NNN assigned, status `DRAFT`, audit entry written |
| T-GV-02 | Raiser signs | status → `PENDING_VERIFY`; PIN token stored in `raised_sign`; verify task appears on superior's dashboard |
| T-GV-03 | Non-superior tries to verify | blocked; toast "not authorised" |
| T-GV-04 | Direct superior verifies | status → `PENDING_QM`; accept task routed to QM |
| T-GV-05 | Non-QM tries to accept | Accept action disabled for non-`QA_MANAGER/ADMIN` |
| T-GV-06 | QM accepts | status → `ACCEPTED`; `ATCA.records.promote()` runs; a `RECORD` file appears in MOD-37 |
| T-GV-07 | Reject at any stage | status → `DRAFT`, `reject_reason` set, raiser notified |
| T-GV-08 | Withdraw a record from another module | `ATCA.records.withdraw({entity_id})` returns the accepted form; snapshot opens |
| T-GV-09 | Default approver resolves to QM | `defaultApprover()` returns the `QA_MANAGER` user (or configured override) |
| T-GV-10 | MOD-27 Approval Flow Map | every `byModule` flow renders; stage counts match `atca_forms` + queue |
| T-GV-11 | Request for Revision button | appears beside FM badge; submitting creates `atca_revisions` DRAFT + QM task |
| T-GV-12 | QM approves revision | status → `APPROVED`; QM PIN signature stored |
| T-GV-13 | Revision deploy gate | a build with a `READY_FOR_DEPLOY` revision lacking QM sign-off is flagged (procedure check) |
| T-GV-14 | Switch to TRIAL (QM) | banner shows; governance keys now `trial__`-prefixed; production keys unchanged |
| T-GV-15 | Non-QM/ADMIN cannot switch env | switch hidden; forced `PRODUCTION` |
| T-GV-16 | Reset trial | `trial__*` keys cleared; production intact; audit logged |
| T-GV-17 | Immutable record | editing an `ACCEPTED` form is blocked; change must go through a revision (new version) |
| T-GV-18 | Audit completeness | every transition in T-GV-01…07 produced an `atca_audit_log` entry |

---

## 11. Open design questions (resolve during build)

1. **Forms with no superior** — if MOD-18 `reports_to` is empty, escalate the verify step directly to QM (skip stage 2) or to a SUPERVISOR fallback? *Recommendation: SUPERVISOR fallback, else straight to QM, and flag it on the card.*
2. **Retrofit scope** — should existing module modals (NCR, CoC, audit plan, etc.) be migrated to `ATCA.forms` immediately, or only new forms? *Recommendation: ship the service + MOD-39 + MOD-27 map first; retrofit modules opportunistically, highest-compliance forms first (CoC, NCR, audit, FAI).*
3. **PIN availability in demo** — MOD-31 PIN sign-off needs a backend; in pure-static demo, fall back to a typed-name + checkbox "I sign" and store that as the signature token, clearly marked `DEMO_SIGN`.
4. **Record format** — HTML snapshot (proposed) vs PDF. HTML is zero-dependency and printable; PDF needs a generator. *Recommendation: HTML snapshot now; PDF later via the template engine (Phase 13 cross-cut).*
5. **Trial preview access control** — Vercel deployment protection vs a token gate. Confirm which the deployment plan supports for QM/ADMIN-only preview URLs.

---

*End of Governance / Forms & Records Dev Plan. Build services first, make flows visible in MOD-27 + the dashboard, then layer revision + trial control, and finish with the MOD-39 console.*
