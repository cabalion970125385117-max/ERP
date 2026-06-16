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

      // Try to parse a JSON body (may fail when the host returns an HTML 404)
      let json = null;
      try { json = await res.json(); } catch (e) { json = null; }

      if (!res.ok) {
        // "Unreachable" = endpoint absent (404) or non-JSON body — i.e. no real
        // backend, as on the static Vercel host or the preview stub server.
        const unreachable = (json === null) || res.status === 404;
        if (method === 'GET' && unreachable) return ATCA.demo.handle('GET', endpoint);
        // Genuine backend error with a JSON message → surface it
        if (json && json.message !== undefined) {
          ATCA.utils.toast(json.message, 'error');
          return null;
        }
        if (method !== 'GET') return ATCA.demo.handle(method, endpoint);
        ATCA.utils.toast('Server error.', 'error');
        return null;
      }
      return json;
    } catch (err) {
      // Network failure → fall back to bundled demo data so the static site works
      console.error('[ATCA API]', err);
      return ATCA.demo.handle(method, endpoint);
    }
  },

  get(endpoint)            { return this.request('GET',    endpoint); },
  post(endpoint, body)     { return this.request('POST',   endpoint, body); },
  put(endpoint, body)      { return this.request('PUT',    endpoint, body); },
  patch(endpoint, body)    { return this.request('PATCH',  endpoint, body); },
  delete(endpoint)         { return this.request('DELETE', endpoint); },
};

/* ============================================================
   DEMO / OFFLINE FALLBACK
   When the LAN backend is unreachable (e.g. the static Vercel
   deployment), serve bundled sample data so pages still render.
   Demo data lives in /assets/js/atca-demo.js (window.ATCA_DEMO).
   ============================================================ */
ATCA.demo = {
  active: false,

  // Resolve a GET endpoint to bundled demo data (query string ignored).
  // Returns [] for anything not explicitly mapped so tables render
  // "No records found." instead of hanging on "Loading…".
  lookup(endpoint) {
    const map = window.ATCA_DEMO || {};
    const path = endpoint.split('?')[0];
    if (Object.prototype.hasOwnProperty.call(map, path)) return map[path];
    return [];
  },

  handle(method, endpoint) {
    this.activate();
    if (method === 'GET') return this.lookup(endpoint);
    // Writes can't persist on a static host — report softly, don't fake an error
    ATCA.utils.toast('Demo mode — changes are not saved (no backend connected).', 'info');
    return { ok: true, demo: true };
  },

  // Show a one-time banner the first time demo mode kicks in.
  activate() {
    if (this.active) return;
    this.active = true;
    if (document.getElementById('atca-demo-banner')) return;
    const b = document.createElement('div');
    b.id = 'atca-demo-banner';
    b.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:11000;'
      + 'background:#1B2A4A;color:#fff;font-size:.78rem;text-align:center;'
      + 'padding:.35rem .75rem;box-shadow:0 -2px 8px rgba(0,0,0,.2);';
    b.innerHTML = '<i class="bi bi-info-circle me-1"></i>'
      + 'Demo mode — showing sample data. The live backend (LAN SQL Server) is not connected on this preview.'
      + ' <span style="cursor:pointer;text-decoration:underline;margin-left:.5rem" '
      + 'onclick="this.parentElement.remove()">dismiss</span>';
    (document.body || document.documentElement).appendChild(b);
  },
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
    const _stEl = document.getElementById('sessionTimeoutModal');
    if (_stEl) this.warningModal = new bootstrap.Modal(_stEl, { backdrop: 'static' });
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

  current() {
    return ATCA.currentUser;
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
   HOME BUTTON — injected on every module page header.
   Handles all three page layouts used across the app:
     A) <header id="topbar">      (Phase 1 sidebar pages)
     B) <div id="atca-topbar">    (Phase 2 sidebar-injected pages)
     C) <nav class="navbar">      (Phase 5+ navbar pages)
   Idempotent: never injects twice (.atca-home-btn guard).
   ============================================================ */
ATCA.nav = {
  _makeBtn(extraClass) {
    const a = document.createElement('a');
    a.href = '/';
    a.className = `btn btn-sm atca-home-btn ${extraClass}`;
    a.title = 'Back to Home';
    a.innerHTML = '<i class="bi bi-house"></i>';
    return a;
  },

  init() {
    const p = window.location.pathname;
    if (p === '/' || p === '/index.html' || p.endsWith('login.html')) return;

    // Layout B — injected sidebar pages
    const atcaTop = document.getElementById('atca-topbar');
    if (atcaTop) {
      const left = atcaTop.querySelector('div:first-child') || atcaTop;
      if (!left.querySelector('.atca-home-btn')) {
        left.insertAdjacentElement('afterbegin', this._makeBtn('btn-outline-secondary me-3'));
      }
      return;
    }

    // Layout A — hardcoded sidebar pages
    const topbar = document.getElementById('topbar');
    if (topbar) {
      if (!topbar.querySelector('.atca-home-btn')) {
        const btn = this._makeBtn('btn-outline-secondary me-2');
        const toggle = topbar.querySelector('#sidebar-toggle');
        if (toggle) toggle.insertAdjacentElement('afterend', btn);
        else topbar.insertAdjacentElement('afterbegin', btn);
      }
      return;
    }

    // Layout C — top navbar pages
    const navbar = document.querySelector('nav.navbar');
    if (navbar && !navbar.querySelector('.atca-home-btn')) {
      const brand = navbar.querySelector('.navbar-brand');
      const btn = this._makeBtn('btn-light me-2');
      if (brand) brand.insertAdjacentElement('beforebegin', btn);
      else navbar.insertAdjacentElement('afterbegin', btn);
    }
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
   PAGINATION — renders Prev / page-info / Next into a container
   render(containerId, currentPage, total, perPage, onPage)
   ============================================================ */
ATCA.pagination = {
  render(containerId, currentPage, total, perPage, onPage) {
    const el = document.getElementById(containerId);
    if (!el) return;
    currentPage = parseInt(currentPage) || 1;
    perPage     = parseInt(perPage) || 50;
    const totalRows  = parseInt(total) || 0;
    const totalPages = Math.max(1, Math.ceil(totalRows / perPage));
    if (totalPages <= 1) { el.innerHTML = ''; return; }

    const btn = (label, page, disabled) =>
      `<button class="btn btn-sm btn-outline-secondary"${disabled ? ' disabled' : ''} data-page="${page}">${label}</button>`;
    el.innerHTML =
      btn('&laquo; Prev', currentPage - 1, currentPage <= 1) +
      `<span class="px-2 small text-muted align-self-center">Page ${currentPage} of ${totalPages}</span>` +
      btn('Next &raquo;', currentPage + 1, currentPage >= totalPages);

    el.querySelectorAll('[data-page]').forEach(b => {
      b.addEventListener('click', () => {
        const p = parseInt(b.dataset.page);
        if (p >= 1 && p <= totalPages && typeof onPage === 'function') onPage(p);
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
   COMPLIANCE TOOLTIPS
   Scan for [data-compliance] / [data-linked] / [data-action-desc]
   attributes and attach Bootstrap popovers shown on hover.

   Usage on any button/element:
     data-compliance="NADCAP AC7114 §6.3 | AMS 2644"
     data-linked="MOD-05 Equipment | MOD-04 Personnel"
     data-action-desc="Records a bath sample and checks spec limits"

   Call ATCA.tooltips.init() after rendering dynamic content.
   ============================================================ */
ATCA.tooltips = {
  init() {
    document.querySelectorAll('[data-compliance],[data-linked],[data-action-desc]').forEach(el => {
      if (bootstrap.Popover.getInstance(el)) return; // already initialised
      const compliance = el.getAttribute('data-compliance');
      const linked     = el.getAttribute('data-linked');
      const desc       = el.getAttribute('data-action-desc');

      const lines = [];
      if (desc)       lines.push(`<div class="mb-1 fw-semibold" style="font-size:.8rem">${desc}</div>`);
      if (compliance) lines.push(`<div style="font-size:.75rem"><i class="bi bi-shield-check" style="color:#ffc107"></i>&nbsp;${compliance}</div>`);
      if (linked)     lines.push(`<div style="font-size:.75rem"><i class="bi bi-diagram-3" style="color:#0dcaf0"></i>&nbsp;${linked}</div>`);

      if (!lines.length) return;

      new bootstrap.Popover(el, {
        content:     lines.join(''),
        html:        true,
        trigger:     'hover focus',
        placement:   'auto',
        container:   'body',
        customClass: 'atca-compliance-tip',
      });
    });
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
   PAGE INIT — singleton promise so multiple callers all await
   the same shared initialization, preventing duplicate timers.

   Usage:  await ATCA.initPage()
   The auto-init below seeds it on DOMContentLoaded so module
   pages that don't call initPage() still get the shared setup.
   ============================================================ */
let _initPromise = null;

ATCA.initPage = function() {
  if (!_initPromise) {
    _initPromise = (async () => {
      ATCA.clock.start();
      ATCA.sidebar.init();
      ATCA.nav.init();
      await ATCA.user.load();
      ATCA.alerts.startPolling();
      ATCA.session.init();
      // Init tooltips for any static buttons already in the DOM
      setTimeout(() => ATCA.tooltips.init(), 200);
    })();
  }
  return _initPromise;
};

// Top-level toast shortcut — pages call ATCA.toast(...) directly
ATCA.toast = (msg, type) => ATCA.utils.toast(msg, type);

document.addEventListener('DOMContentLoaded', () => ATCA.initPage());
