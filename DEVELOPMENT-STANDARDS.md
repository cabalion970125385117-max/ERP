# ATCA-ERP Development Standards

**ATC Aviation Pte Ltd — Internal Development Governance**  
AS9100D · NADCAP AC7108 · NADCAP AC7110 · NADCAP AC7114 · NAS410  
Version: 1.0 · Effective: 2026-06-29

---

## Purpose

This document defines mandatory development standards for all ATCA-ERP modules. Every developer and AI assistant contributing to this codebase must follow these rules without exception. They exist to satisfy aerospace quality compliance requirements (AS9100D §7.5, §8.5.6) and to ensure a full, non-repudiable audit trail for all system data.

---

## Rule 1 — Audit Log on Every User Input or Change

**Every mutation** — create, update, delete, status change, approval, rejection — must produce an audit log entry. No silent writes.

### What to log

| Field | Required | Description |
|---|---|---|
| `user_id` | Yes | Who made the change |
| `username` | Yes | Display name at time of action |
| `lan_ip` | Yes | Client IP (LAN-only system) |
| `action` | Yes | `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT`, `STATUS_CHANGE` |
| `module_id` | Yes | e.g. `MOD-11`, `MOD-02`, `MOD-33` |
| `table_name` | Yes | Database table or localStorage key affected |
| `record_id` | Yes | Primary key of the affected record |
| `old_value` | Conditional | Full prior state as JSON (required on UPDATE/DELETE) |
| `new_value` | Conditional | Full new state as JSON (required on CREATE/UPDATE) |
| `timestamp` | Yes | ISO-8601 UTC timestamp |
| `change_reason` | When prompted | Free-text reason (required for approval decisions) |

### Backend implementation

Use the existing `auditLog()` middleware in `src/backend/middleware/auth.js`. Every write endpoint **must** call it:

```js
await auditLog({
  userId, username, lanIp,
  action: 'UPDATE',
  tableName: 'pm_checklists',
  recordId: checklistId,
  moduleId: 'MOD-11',
  oldValue: JSON.stringify(before),
  newValue: JSON.stringify(after),
});
```

### Frontend / demo-mode implementation (localStorage)

For localStorage-backed modules (demo/preview mode), maintain a parallel `atca_audit_log` array:

```js
function auditLog(action, moduleId, tableKey, recordId, oldVal, newVal) {
  const log = JSON.parse(localStorage.getItem('atca_audit_log') || '[]');
  log.push({
    user_id:    ATCA.currentUser?.user_id || 'system',
    username:   ATCA.currentUser?.full_name || 'System',
    action,
    module_id:  moduleId,
    table_name: tableKey,
    record_id:  recordId,
    old_value:  oldVal ? JSON.stringify(oldVal) : null,
    new_value:  newVal ? JSON.stringify(newVal) : null,
    timestamp:  new Date().toISOString(),
  });
  localStorage.setItem('atca_audit_log', JSON.stringify(log));
}
```

Call this helper immediately before or after every localStorage write in module JS.

### Enforcement

- No write path (save button, API call, status update) may proceed without logging.
- Audit log entries are **append-only**. Never delete or overwrite them.
- MOD-26 System Maintenance Console should expose audit log viewing (already implemented via `activity_logs` table).

---

## Rule 2 — Form Number (FM-NNN) for Every Form Created

**Every controlled form** must be assigned a permanent, unique form number upon first save.

### Numbering format

```
FM-NNN        (e.g. FM-001, FM-042, FM-137)
```

Where `NNN` is a zero-padded integer from a global auto-increment sequence.

### Sequence management

**Backend (SQL Server):**

```sql
-- Dedicated sequence table (created in migration 040+)
CREATE TABLE FormIdSequence (
  seq_id   INT IDENTITY(1,1) PRIMARY KEY,
  reserved BIT DEFAULT 0
);

-- Atomic next-number function
INSERT INTO FormIdSequence DEFAULT VALUES;
SELECT 'FM-' + RIGHT('000' + CAST(SCOPE_IDENTITY() AS VARCHAR), 3);
```

**Frontend / demo-mode (localStorage):**

```js
const FORM_SEQ_KEY = 'atca_form_id_seq';
function nextFormId() {
  const n = parseInt(localStorage.getItem(FORM_SEQ_KEY) || '0') + 1;
  localStorage.setItem(FORM_SEQ_KEY, String(n));
  return 'FM-' + String(n).padStart(3, '0');
}
```

### When to assign

- Assign the form number **on first save only**. Never regenerate it.
- If a record already has a `form_id`, preserve it on all subsequent edits.
- Display the form number prominently (top of form, header badge) at all times.

### What counts as a "controlled form"

Any document that:
- Is completed by a user to record a process, decision, or inspection result
- Goes through a review or approval workflow
- Must be traceable for NADCAP/AS9100D audit purposes

Examples: PM Checklists (MOD-11), NCR reports (MOD-07), CAPA records (MOD-07), Audit plans (MOD-08), CoC documents (MOD-24), Job Travelers (MOD-13), Work Permits (MOD-11).

---

## Rule 3 — Persistent Revision History on Every Document

**Every document must maintain a full, immutable revision history.** A "document" is any structured record that can be edited after initial creation and that is subject to QMS control.

### Required revision fields on every controlled record

| Field | Type | Description |
|---|---|---|
| `form_version` | INT | Increments by 1 on each approved revision (starts at 1) |
| `status` | VARCHAR | `DRAFT` → `PENDING_QM` → `APPROVED` or `REJECTED` |
| `created_by` | VARCHAR | Username who created the record |
| `created_at` | DATETIME | Timestamp of creation |
| `revised_by` | VARCHAR | Username of last editor |
| `revised_at` | DATETIME | Timestamp of last edit |
| `approved_by` | VARCHAR | QM/QA approver username |
| `approved_at` | DATETIME | Timestamp of approval |
| `reject_reason` | VARCHAR | Populated only if status = REJECTED |

### Revision history table (for documents with full change tracking)

For documents where field-level change history is required (e.g. SOPs, process specs), maintain a `*_revisions` shadow table:

```sql
CREATE TABLE DocumentRevisions (
  revision_id   INT IDENTITY(1,1) PRIMARY KEY,
  document_id   VARCHAR(50) NOT NULL,
  form_version  INT NOT NULL,
  changed_by    VARCHAR(100),
  changed_at    DATETIME DEFAULT GETDATE(),
  change_summary VARCHAR(500),
  snapshot_json NVARCHAR(MAX),  -- full JSON snapshot of document at this version
  FOREIGN KEY (document_id) REFERENCES Documents(document_id)
);
```

### State machine for all controlled documents

```
DRAFT  ──[Submit for QM approval]──►  PENDING_QM
                                           │
                              ┌────────────┴────────────┐
                              ▼                         ▼
                           APPROVED               REJECTED
                              │
                  [Any edit by ENGINEER+]
                              │
                              ▼
                           DRAFT  (form_version + 1)
```

Rules:
- Any edit to an **APPROVED** document resets `status` to `DRAFT` and increments `form_version`.
- A document in `PENDING_QM` state is **locked** — no edits, no deletions.
- Only `QA_MANAGER` or `ADMIN` may approve or reject.
- Rejection must include a `reject_reason`. The form returns to `DRAFT` at the same version for correction.

### Frontend display requirements

Every form or document page must show:

```
[FM-042]  [v3]  [APPROVED]   Approved by: Sarah Lim  ·  2026-06-15
```

Use consistent badge CSS classes:
- `.cl-form-id` — form number chip
- `.cl-version` — version badge (e.g. `v3`)
- `.cl-status-draft` / `.cl-status-pending` / `.cl-status-approved` / `.cl-status-rejected`

---

## Development Checklist (apply before marking any feature complete)

Before calling a feature done, verify all three rules are satisfied:

- [ ] Every save/update/delete path calls `auditLog()` (or the localStorage equivalent)
- [ ] Every new controlled form is assigned an `FM-NNN` number on first save; existing form numbers are never regenerated
- [ ] Every controlled document has `form_version`, `status`, and state-machine transitions implemented
- [ ] DRAFT → PENDING_QM → APPROVED/REJECTED workflow is wired up to the User Dashboard approval queue (`atca_pending_approvals`)
- [ ] Form numbers and status badges are displayed on all list and detail views
- [ ] Editing an APPROVED document resets to DRAFT and bumps `form_version`
- [ ] Deleting a PENDING_QM document is blocked

---

## File Encoding

All frontend HTML/JS files must be saved as **UTF-8 no-BOM**. Never use PowerShell `Set-Content -Encoding utf8` (PS 5.1 adds a BOM, which causes mojibake across the entire app). Use the Write/Edit tools in Claude Code, or specify `-Encoding utf8NoBOM` if using PowerShell.

---

## Sidebar Navigation

The sidebar nav is injected from `ATCA.sidebar._html` into every page by `atca-core.js`. Never edit per-page sidebar HTML. All sidebar changes go through `ATCA.sidebar._html` only.

---

## Page Initialization

Always use `ATCA.initPage()` to initialize a module page. Never call `ATCA.nav.init()`, `ATCA.auth.init()`, or sidebar injection functions directly from module JS.

---

## Preview Server

All new API stubs go into `preview_server.py` (the Python file). Never add stubs to `preview-server.js`. The Python preview server is the sole stub backend for local development.

---

## Post-Feature Checklist

After every feature change, before calling the task done:

1. Update `USER-MANUAL.md` (relevant module section + version history entry)
2. Update `ROADMAP.md` (mark phase items complete if applicable)
3. Update `memory/project-overview.md` (module registry entry)
4. Update `README.md` if architecture or module list changed
5. Update `TEST-PLAN.md` if new test cases are needed

---

*This document is a controlled development reference. Any changes must be reviewed by the lead developer and version-bumped at the top of this file.*
