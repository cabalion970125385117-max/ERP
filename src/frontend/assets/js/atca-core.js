/**
 * ATCA-ERP v1.0 — Core JavaScript
 * ATC Aviation Pte Ltd | AS9100D | NADCAP AC7114 | NAS410
 * LAN-only: no external requests
 */

'use strict';

/* ============================================================
   ATCA NAMESPACE
   ============================================================ */
const ATCA = {
  version: '1.0.0',
  apiBase: '/api/v1',
  sessionTimeoutMs: 8 * 60 * 60 * 1000,  // 8-hour shift
  warnBeforeMs:     5 * 60 * 1000,         // warn 5 min before

  // Current session user (populated by /api/v1/auth/me on load)
  currentUser: null,
};

/* ============================================================
   UTILS
   ============================================================ */
ATCA.utils = {

  /** Format UTC ISO string to local SG date (dd MMM yyyy) */
  fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-SG', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  },

  /** Format date + time */
  fmtDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-SG', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  },

  /** Days until a date (negative = overdue) */
  daysUntil(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.ceil((d - now) / 86400000);
  },

  /** RAG colour based on days remaining */
  ragFromDays(days, warnAt = 90, critAt = 30) {
    if (days < 0)       return 'red';
    if (days <= critAt) return 'red';
    if (days <= warnAt) return 'amber';
    return 'green';
  },

  /** Escape HTML to prevent XSS */
  escHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  /** Generate status badge HTML */
  statusBadge(status) {
    const cls = status ? status.toLowerCase().replace(/_/g, '-') : '';
    return `<span class="status-badge ${cls}">${ATCA.utils.escHtml(status || '—')}</span>`;
  },

  /** Risk score badge */
  riskBadge(score) {
    let cls = 'low';
    if (score >= 15) cls = 'high';
    else if (score >= 8) cls = 'medium';
    return `<span class="risk-score ${cls}">${score}</span>`;
  },

  /** Show toast notification */
  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const id = 'toast-' + Date.now();
    const icon = type === 'success' ? 'check-circle-fill' :
                 type === 'error'   ? 'x-circle-fill' :
                 type === 'warning' ? 'exclamation-triangle-fill' : 'info-circle-fill';
    const colorClass = type === 'success' ? 'text-success' :
                       type === 'error'   ? 'text-danger' :
                       type === 'warning' ? 'text-warning' : 'text-info';
    const html = `
      <div id="${id}" class="toast align-items-center border-0" role="alert" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            <i class="bi bi-${icon} ${colorClass} me-2"></i>
            ${ATCA.utils.escHtml(message)}
          </div>
          <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', html);
    const el = document.getElementById(id);
    const t = new bootstrap.Toast(el, { delay: 4000 });
    t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  },
};

/* ============================================================
   API CLIENT — Fetch wrapper with CSRF + auth
   ============================================================ */
ATCA.api = {

  async request(method, endpoint, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(ATCA.apiBase + endpoint, opts);

      if (res.status === 401) {
        // Session expired — redirect to login
        window.location.href = '/login?reason=session_expired';
        return null;
      }

      if (res.status === 403) {
        ATCA.utils.toast('Access denied for this action.', 'error');
        return null;
      }

      const json = await res.json();
      if (!res.ok) {
        ATCA.utils.toast(json.message || 'Server error.', 'error');
        return null;
      }
      return json;
    } catch (err) {
      ATCA.utils.toast('Network error — check LAN connection.', 'error');
      console.error('[ATCA API]', err);
      return null;
    }
  },

  get(endpoint)          { return this.request('GET',    endpoint); },
  post(endpoint, body)   { return this.request('POST',   endpoint, body); },
  put(endpoint, body)    { return this.request('PUT',    endpoint, body); },
  patch(endpoint, body)  { return this.request('PATCH',  endpoint, body); },
};

/* ============================================================
   SESSION MANAGER
   ============================================================ */
ATCA.session = {
  warningModal: null,
  countdownInterval: null,
  warningTimeout: null,
  logoutTimeout: null,

  init() {
    this.warningModal = new bootstrap.Modal(
      document.getElementById('sessionTimeoutModal'), { backdrop: 'static' }
    );
    this.reset();

    document.getElementById('keep-session-btn')
      ?.addEventListener('click', () => this.extend());

    // Reset on user activity
    ['click','keydown','mousemove'].forEach(ev =>
      document.addEventListener(ev, () => this.reset(), { passive: true })
    );
  },

  reset() {
    clearTimeout(this.warningTimeout);
    clearTimeout(this.logoutTimeout);
    clearInterval(this.countdownInterval);
    this.warningModal?.hide();

    this.warningTimeout = setTimeout(() => this.warn(), ATCA.sessionTimeoutMs - ATCA.warnBeforeMs);
    this.logoutTimeout  = setTimeout(() => { window.location.href = '/logout?reason=timeout'; }, ATCA.sessionTimeoutMs);
  },

  warn() {
    let secs = Math.floor(ATCA.warnBeforeMs / 1000);
    const el = document.getElementById('timeout-countdown');
    const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
    if (el) el.textContent = fmt(secs);
    this.warningModal?.show();
    this.countdownInterval = setInterval(() => {
      secs--;
      if (el) el.textContent = fmt(secs);
      if (secs <= 0) clearInterval(this.countdownInterval);
    }, 1000);
  },

  async extend() {
    await ATCA.api.post('/auth/session-extend');
    this.reset();
  },
};

/* ============================================================
   USER PROFILE LOADER
   ============================================================ */
ATCA.user = {
  async load() {
    const data = await ATCA.api.get('/auth/me');
    if (!data) return;
    ATCA.currentUser = data;

    const nameEl     = document.getElementById('user-display-name');
    const avatarEl   = document.getElementById('user-avatar-initials');

    if (nameEl)   nameEl.textContent = data.full_name || data.username;
    if (avatarEl) avatarEl.textContent = ATCA.user.initials(data.full_name || data.username);
  },

  initials(name) {
    return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
  },

  hasRole(...roles) {
    return roles.includes(ATCA.currentUser?.role);
  },

  isQA() {
    return ATCA.user.hasRole('ADMIN','QA_MANAGER');
  },
};

/* ============================================================
   ALERT BADGE LOADER
   ============================================================ */
ATCA.alerts = {
  async load() {
    const data = await ATCA.api.get('/alerts/summary');
    if (!data) return;
    const countEl = document.getElementById('topbar-alert-count');
    if (countEl && data.total > 0) {
      countEl.textContent = data.total > 99 ? '99+' : data.total;
      countEl.style.display = '';
    }
  },

  // Poll every 5 minutes
  startPolling() {
    this.load();
    setInterval(() => this.load(), 5 * 60 * 1000);
  },
};

/* ============================================================
   SIDEBAR CLOCK
   ============================================================ */
ATCA.clock = {
  start() {
    const el = document.getElementById('sidebar-datetime');
    if (!el) return;
    const tick = () => {
      el.textContent = new Date().toLocaleTimeString('en-SG', {
        hour: '2-digit', minute: '2-digit', hour12: false
      });
    };
    tick();
    setInterval(tick, 30000);
  },
};

/* ============================================================
   MOBILE SIDEBAR TOGGLE (Phase 2)
   ============================================================ */
ATCA.sidebar = {
  init() {
    const btn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    btn?.addEventListener('click', () => sidebar?.classList.toggle('open'));
  },
};

/* ============================================================
   DATA TABLE HELPERS
   ============================================================ */
ATCA.table = {
  /**
   * Render an array of rows into a <tbody> element
   * @param {string} tbodyId - ID of <tbody> element
   * @param {Array}  rows    - data rows
   * @param {Function} rowFn - (row, index) => HTML string for <tr>
   */
  render(tbodyId, rows, rowFn) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="99" class="text-center text-muted py-4">No records found.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((r, i) => rowFn(r, i)).join('');
  },

  /** Simple client-side search filter */
  filterSetup(inputId, tbodyId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      const rows = document.querySelectorAll(`#${tbodyId} tr`);
      rows.forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  },
};

/* ============================================================
   FORM HELPERS
   ============================================================ */
ATCA.form = {
  /** Collect form data as plain object */
  collect(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    const fd = new FormData(form);
    const obj = {};
    fd.forEach((v, k) => { obj[k] = v; });
    return obj;
  },

  /** Mark field as invalid */
  setError(fieldId, msg) {
    const el = document.getElementById(fieldId);
    if (!el) return;
    el.classList.add('is-invalid');
    let fb = el.nextElementSibling;
    if (!fb || !fb.classList.contains('invalid-feedback')) {
      fb = document.createElement('div');
      fb.className = 'invalid-feedback';
      el.after(fb);
    }
    fb.textContent = msg;
  },

  clearErrors(formId) {
    document.querySelectorAll(`#${formId} .is-invalid`)
      .forEach(el => el.classList.remove('is-invalid'));
  },
};

/* ============================================================
   TOAST CONTAINER — injected into body
   ============================================================ */
(function injectToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  div.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  div.style.zIndex = '9999';
  document.body.appendChild(div);
})();

/* ============================================================
   INIT ON DOM READY
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  ATCA.clock.start();
  ATCA.sidebar.init();
  await ATCA.user.load();
  ATCA.alerts.startPolling();
  ATCA.session.init();
});
