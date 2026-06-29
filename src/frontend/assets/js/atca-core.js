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

    // Pending approvals badge on bell (from shared queue)
    try {
      const aprs = JSON.parse(localStorage.getItem('atca_pending_approvals') || '[]');
      const pending = aprs.filter(a => a.status === 'PENDING').length;
      const countEl = document.getElementById('topbar-alert-count');
      if (countEl && pending > 0) {
        countEl.textContent = pending > 99 ? '99+' : pending;
        countEl.style.display = '';
      }
    } catch {}

    // Wire user pill → My Dashboard
    const pill = document.getElementById('user-menu-btn');
    if (pill && !pill.dataset.wired) {
      pill.dataset.wired = '1';
      pill.style.cursor = 'pointer';
      pill.addEventListener('click', () => { window.location.href = '/user-dashboard.html'; });
    }
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
  _panelOpen: false,

  async load() {
    const data = await ATCA.api.get('/alerts/summary');
    if (!data) return;
    const countEl = document.getElementById('topbar-alert-count');
    if (countEl && data.total > 0) {
      countEl.textContent = data.total > 99 ? '99+' : data.total;
      countEl.style.display = '';
    }
  },

  _getPanel() {
    let panel = document.getElementById('alert-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'alert-panel';
      document.body.appendChild(panel);
    }
    return panel;
  },

  async openPanel() {
    const panel = this._getPanel();
    panel.innerHTML = '<div class="alert-panel-header"><span>System Alerts</span><a href="/modules/mod15-dashboard/">View all</a></div><div class="alert-empty">Loading…</div>';
    panel.classList.add('open');
    this._panelOpen = true;

    const data = await ATCA.api.get('/alerts/list');
    const items = data?.items || [];
    const sevIcon = { CRITICAL: 'exclamation-octagon-fill', WARNING: 'exclamation-triangle-fill', INFO: 'info-circle-fill' };
    const body = items.length === 0
      ? '<div class="alert-empty"><i class="bi bi-check-circle me-1"></i>No active alerts. All clear.</div>'
      : items.map(a => `
          <div class="alert-item" onclick="window.location='${ATCA.utils.escHtml(a.link)}'">
            <i class="bi bi-${sevIcon[a.severity] || 'bell-fill'} alert-icon sev-${a.severity}"></i>
            <div class="alert-body">
              <div class="alert-module">${ATCA.utils.escHtml(a.module)} · ${ATCA.utils.escHtml(a.module_name)}</div>
              <div class="alert-msg">${ATCA.utils.escHtml(a.message)}</div>
            </div>
          </div>`).join('');

    panel.innerHTML = `<div class="alert-panel-header"><span>System Alerts</span><a href="/modules/mod15-dashboard/">View all</a></div>${body}`;
  },

  closePanel() {
    const panel = document.getElementById('alert-panel');
    if (panel) panel.classList.remove('open');
    this._panelOpen = false;
  },

  wireButton() {
    const btn = document.getElementById('topbar-alert-btn');
    if (!btn || btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this._panelOpen) { this.closePanel(); } else { this.openPanel(); }
    });
    document.addEventListener('click', (e) => {
      if (this._panelOpen && !document.getElementById('alert-panel')?.contains(e.target)) {
        this.closePanel();
      }
    });
  },

  // Poll every 5 minutes
  startPolling() {
    this.load();
    this.wireButton();
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
  _html: `
<div class="sidebar-brand"><h6>ATCA-ERP</h6><small>ATC Aviation Pte Ltd</small></div>
<a href="/user-dashboard.html" class="nav-dash-pin" id="sidebar-dash-link">
  <span class="nav-icon"><i class="bi bi-person-circle"></i></span>
  <span>My Dashboard</span>
  <span class="badge bg-danger" id="sidebar-dash-badge" style="display:none;"></span>
</a>
<div class="nav-section-label" onclick="ATCA.sidebar._toggle(this)"><span>Quality Management</span><i class="bi bi-chevron-right nav-chevron"></i></div>
<div class="nav-group nav-collapsed">
<a href="/modules/mod01-qms-core/" class="nav-link"><span class="nav-icon"><i class="bi bi-award"></i></span>QMS Core</a>
<a href="/modules/mod02-document-control/" class="nav-link"><span class="nav-icon"><i class="bi bi-folder2-open"></i></span>Document Control</a>
<a href="/modules/mod07-ncr-capa/" class="nav-link"><span class="nav-icon"><i class="bi bi-exclamation-triangle"></i></span>NCR &amp; CAPA</a>
<a href="/modules/mod08-audit-management/" class="nav-link"><span class="nav-icon"><i class="bi bi-clipboard-check"></i></span>Audit Management</a>
<a href="/modules/mod20-customer-complaint/" class="nav-link"><span class="nav-icon"><i class="bi bi-chat-left-dots"></i></span>Complaint &amp; 8D</a>
</div>
<div class="nav-section-label" onclick="ATCA.sidebar._toggle(this)"><span>NDT &amp; Laboratory</span><i class="bi bi-chevron-right nav-chevron"></i></div>
<div class="nav-group nav-collapsed">
<a href="/modules/mod03-fpi-process/" class="nav-link"><span class="nav-icon"><i class="bi bi-radioactive"></i></span>FPI Process</a>
<a href="/modules/mod17-mpt-process/" class="nav-link"><span class="nav-icon"><i class="bi bi-magnet"></i></span>MPT Process</a>
<a href="/modules/mod04-ndt-personnel/" class="nav-link"><span class="nav-icon"><i class="bi bi-person-badge"></i></span>Personnel / NAS410</a>
<a href="/modules/mod05-equipment-calibration/" class="nav-link"><span class="nav-icon"><i class="bi bi-tools"></i></span>Equipment &amp; Calibration</a>
<a href="/modules/mod06-bath-control/" class="nav-link"><span class="nav-icon"><i class="bi bi-droplet"></i></span>Chemical / Bath Control</a>
<a href="/modules/mod19-extended-laboratory/" class="nav-link"><span class="nav-icon"><i class="bi bi-eyedropper"></i></span>Extended Laboratory</a>
</div>
<div class="nav-section-label" onclick="ATCA.sidebar._toggle(this)"><span>Operations</span><i class="bi bi-chevron-right nav-chevron"></i></div>
<div class="nav-group nav-collapsed">
<a href="/modules/mod09-sales-customer-service/" class="nav-link"><span class="nav-icon"><i class="bi bi-building"></i></span>Sales &amp; Customer</a>
<a href="/modules/mod10-production-management/" class="nav-link"><span class="nav-icon"><i class="bi bi-gear-wide-connected"></i></span>Production</a>
<a href="/modules/mod13-work-order/" class="nav-link"><span class="nav-icon"><i class="bi bi-file-earmark-ruled"></i></span>Work Order / Traveler</a>
<a href="/modules/mod24-certificate-of-conformance/" class="nav-link"><span class="nav-icon"><i class="bi bi-file-earmark-check"></i></span>Certificate of Conformance</a>
<a href="/modules/mod11-maintenance/" class="nav-link"><span class="nav-icon"><i class="bi bi-wrench-adjustable"></i></span>Maintenance</a>
<a href="/modules/mod12-purchasing/" class="nav-link"><span class="nav-icon"><i class="bi bi-cart"></i></span>Purchasing &amp; AVL</a>
<a href="/modules/mod14-inventory/" class="nav-link"><span class="nav-icon"><i class="bi bi-boxes"></i></span>Inventory</a>
</div>
<div class="nav-section-label" onclick="ATCA.sidebar._toggle(this)"><span>Business &amp; HR</span><i class="bi bi-chevron-right nav-chevron"></i></div>
<div class="nav-group nav-collapsed">
<a href="/modules/mod16-finance/" class="nav-link"><span class="nav-icon"><i class="bi bi-cash-coin"></i></span>Finance</a>
<a href="/modules/mod18-hr-management/" class="nav-link"><span class="nav-icon"><i class="bi bi-people"></i></span>HR Management</a>
<a href="/modules/mod21-communications/" class="nav-link"><span class="nav-icon"><i class="bi bi-megaphone"></i></span>Communications</a>
<a href="/modules/mod22-leave-attendance/" class="nav-link"><span class="nav-icon"><i class="bi bi-calendar-check"></i></span>Leave &amp; Attendance</a>
<a href="/modules/mod23-payroll/" class="nav-link"><span class="nav-icon"><i class="bi bi-wallet2"></i></span>Payroll</a>
</div>
<div class="nav-section-label" onclick="ATCA.sidebar._toggle(this)"><span>Process Control</span><i class="bi bi-chevron-right nav-chevron"></i></div>
<div class="nav-group nav-collapsed">
<a href="/modules/mod30-pyrometry/" class="nav-link"><span class="nav-icon"><i class="bi bi-thermometer-half"></i></span>Pyrometry &amp; Heat-Treat</a>
<a href="/modules/mod31-operator-competency/" class="nav-link"><span class="nav-icon"><i class="bi bi-person-check"></i></span>Operator Competency</a>
<a href="/modules/mod32-bay-scheduler/" class="nav-link"><span class="nav-icon"><i class="bi bi-layout-split"></i></span>Bay Scheduler</a>
<a href="/modules/mod33-spec-flowdown/" class="nav-link"><span class="nav-icon"><i class="bi bi-diagram-3"></i></span>Spec &amp; Flowdown</a>
<a href="/modules/mod34-chemical-hazmat/" class="nav-link"><span class="nav-icon"><i class="bi bi-exclamation-octagon"></i></span>Chemical &amp; Hazmat</a>
<a href="/modules/mod35-regulatory-certs/" class="nav-link"><span class="nav-icon"><i class="bi bi-shield-check"></i></span>Regulatory Certs</a>
<a href="/modules/mod36-equipment-ppm/" class="nav-link"><span class="nav-icon"><i class="bi bi-gear-wide-connected"></i></span>Equipment PPM</a>
</div>
<div class="nav-section-label" onclick="ATCA.sidebar._toggle(this)"><span>Capability &amp; Analytics</span><i class="bi bi-chevron-right nav-chevron"></i></div>
<div class="nav-group nav-collapsed">
<a href="/modules/mod28-pcm/" class="nav-link"><span class="nav-icon"><i class="bi bi-grid-3x3-gap"></i></span>Capability Master</a>
<a href="/modules/mod29-qualification/" class="nav-link"><span class="nav-icon"><i class="bi bi-patch-check"></i></span>Customer Qualification</a>
<a href="/modules/mod15-dashboard/" class="nav-link"><span class="nav-icon"><i class="bi bi-speedometer2"></i></span>KPI Dashboard</a>
<a href="/modules/mod27-value-flow/" class="nav-link"><span class="nav-icon"><i class="bi bi-diagram-2"></i></span>Value Flow</a>
<a href="/user-dashboard.html" class="nav-link"><span class="nav-icon"><i class="bi bi-person-circle"></i></span>My Dashboard</a>
</div>
<div class="nav-section-label" onclick="ATCA.sidebar._toggle(this)"><span>System</span><i class="bi bi-chevron-right nav-chevron"></i></div>
<div class="nav-group nav-collapsed">
<a href="/modules/mod25-user-management/" class="nav-link"><span class="nav-icon"><i class="bi bi-person-gear"></i></span>User Management</a>
<a href="/modules/mod37-file-repository/" class="nav-link"><span class="nav-icon"><i class="bi bi-folder2-open"></i></span>File Repository</a>
<a href="/modules/mod-chat/" class="nav-link"><span class="nav-icon"><i class="bi bi-chat-dots"></i></span>Internal Chat</a>
<a href="/modules/mod26-maintenance/" class="nav-link"><span class="nav-icon"><i class="bi bi-tools"></i></span>Maintenance Console</a>
<a href="/modules/mod-changelog/" class="nav-link"><span class="nav-icon"><i class="bi bi-journal-text"></i></span>Change Log</a>
<a href="/modules/mod-bugreport/" class="nav-link"><span class="nav-icon"><i class="bi bi-bug"></i></span>Bug Report</a>
<a href="/user-guide.html" class="nav-link"><span class="nav-icon"><i class="bi bi-journal-bookmark"></i></span>User Guide</a>
</div>
<div class="sidebar-footer">ATCA-ERP v1.0 · AS9100D · NADCAP<br>LAN-Only · <span id="sidebar-datetime"></span></div>`,

  _toggle(label) {
    const group = label.nextElementSibling;
    if (!group || !group.classList.contains('nav-group')) return;
    const isOpen = !group.classList.contains('nav-collapsed');
    // Collapse all sections
    label.closest('nav').querySelectorAll('.nav-group').forEach(g => {
      g.classList.add('nav-collapsed');
      g.previousElementSibling?.classList.remove('nav-open');
    });
    // If it was open, leave all collapsed; if it was closed, open it
    if (isOpen) return;
    group.classList.remove('nav-collapsed');
    label.classList.add('nav-open');
  },

  init() {
    // Single source of truth: inject the canonical nav into whichever sidebar
    // container the page provides. Layout B/C pages ship an empty
    // <nav id="atca-sidebar">; Layout A pages ship a hardcoded <nav id="sidebar">
    // that is often an abbreviated, out-of-date copy (missing MPT Process, etc.)
    // — overwrite it so the side panel is identical on every page.
    let bar = document.getElementById('atca-sidebar');
    if (!bar) {
      // Legacy Layout A app sidebar is <nav id="sidebar"> with NO .atca-sidebar
      // class. MOD-34/35/36 reuse id="sidebar" for their OWN module nav (class
      // .atca-sidebar) — never hijack those.
      const legacy = document.getElementById('sidebar');
      if (legacy && !legacy.classList.contains('atca-sidebar')) bar = legacy;
    }
    // Navbar-only pages (e.g. MOD-11/12/14/16/18/21–23) ship neither container —
    // the base `body{display:flex}` then renders their top navbar as a tall left
    // column. Build the standard shell so they get the sidebar like every other page:
    // wrap the existing body content in .atca-main and prepend an #atca-sidebar.
    // Skip pages that carry their own standalone sidebar chrome (.atca-sidebar).
    if (!bar && !document.querySelector('.atca-sidebar')) {
      const main = document.createElement('div');
      main.className = 'atca-main';
      while (document.body.firstChild) main.appendChild(document.body.firstChild);
      bar = document.createElement('nav');
      bar.id = 'atca-sidebar';
      document.body.appendChild(bar);
      document.body.appendChild(main);
    }
    if (!bar || bar.dataset.injected) return;
    bar.innerHTML = this._html;
    bar.dataset.injected = '1';
    // Mark the active link — the longest href that prefixes the current path wins
    // (so /modules/mod07-ncr-capa/ncr-detail.html still highlights NCR & CAPA).
    const cur = window.location.pathname.replace(/\/$/, '');
    let best = null, bestLen = -1;
    bar.querySelectorAll('a.nav-link').forEach(a => {
      const href = (a.getAttribute('href') || '').replace(/\/$/, '');
      if (href && cur.startsWith(href) && href.length > bestLen) { best = a; bestLen = href.length; }
    });
    best?.classList.add('active');
    // Auto-expand the section containing the active link; fall back to first section
    const activeGroup = best?.closest('.nav-group');
    const firstGroup = bar.querySelector('.nav-group');
    const groupToOpen = activeGroup || firstGroup;
    if (groupToOpen) {
      groupToOpen.classList.remove('nav-collapsed');
      groupToOpen.previousElementSibling?.classList.add('nav-open');
    }
    // Wire mobile toggle
    document.getElementById('sidebar-toggle')
      ?.addEventListener('click', () => bar.classList.toggle('open'));
    // Live badge on the pinned My Dashboard link
    this._updateBadge();
  },

  _updateBadge() {
    try {
      const pending = JSON.parse(localStorage.getItem('atca_pending_approvals') || '[]')
        .filter(a => a.status === 'PENDING').length;
      const me = ATCA.currentUser?.full_name;
      const notifs = me
        ? JSON.parse(localStorage.getItem('atca_notifications') || '[]')
            .filter(n => n.recipient_name === me && !n.read).length
        : 0;
      const total = pending + notifs;
      const badge = document.getElementById('sidebar-dash-badge');
      if (!badge) return;
      badge.textContent = total > 9 ? '9+' : (total || '');
      badge.style.display = total ? '' : 'none';
    } catch {}
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
   FILE STORE — cross-module file repository (localStorage)
   Modules store files via ATCA.fileStore.put(meta, dataUrl)
   and retrieve them via ATCA.fileStore.get(fileId) /
   ATCA.fileStore.open(fileId).
   Storage key: 'atca_file_store'
   ============================================================ */
ATCA.fileStore = (function() {
  const _KEY = 'atca_file_store';
  const _SEQ = 'atca_file_store_seq';

  function _load()  { return JSON.parse(localStorage.getItem(_KEY) || '[]'); }
  function _save(f) { localStorage.setItem(_KEY, JSON.stringify(f)); }
  function _nextId() {
    const n = (parseInt(localStorage.getItem(_SEQ) || '0') + 1);
    localStorage.setItem(_SEQ, String(n));
    return 'FILE-' + String(n).padStart(4, '0');
  }

  return {
    /**
     * Store a file. Returns the new file_id.
     * @param {Object} meta  { module, entity_type, entity_id, filename, mime_type, size_bytes, file_tag, uploaded_by }
     * @param {string} dataUrl  base64 data URL
     */
    put(meta, dataUrl) {
      const files = _load();
      const rec = {
        file_id:     _nextId(),
        module:      meta.module      || 'SYSTEM',
        entity_type: meta.entity_type || '',
        entity_id:   meta.entity_id   || '',
        filename:    meta.filename    || 'file',
        mime_type:   meta.mime_type   || 'application/octet-stream',
        size_bytes:  meta.size_bytes  || 0,
        file_tag:    meta.file_tag    || 'DOCUMENT',
        uploaded_by: meta.uploaded_by || (ATCA.currentUser ? ATCA.currentUser.displayName : 'System'),
        uploaded_at: new Date().toISOString(),
        data_url:    dataUrl || null,
      };
      files.push(rec);
      _save(files);
      return rec.file_id;
    },

    /** Retrieve a single file record by file_id. Returns null if not found. */
    get(fileId) {
      return _load().find(f => f.file_id === fileId) || null;
    },

    /**
     * List files, optionally filtered.
     * @param {Object} filter  { module?, entity_id?, file_tag? }
     */
    list(filter) {
      let files = _load();
      if (!filter) return files;
      if (filter.module)    files = files.filter(f => f.module    === filter.module);
      if (filter.entity_id) files = files.filter(f => f.entity_id === filter.entity_id);
      if (filter.file_tag)  files = files.filter(f => f.file_tag  === filter.file_tag);
      return files;
    },

    /** Delete a file record from the store. */
    remove(fileId) { _save(_load().filter(f => f.file_id !== fileId)); },

    /** Open a stored file in a new browser tab. */
    open(fileId) {
      const rec = this.get(fileId);
      if (!rec || !rec.data_url) { ATCA.toast('File not available in repository.', 'warning'); return; }
      try {
        const [header, b64] = rec.data_url.split(',');
        const mime = header.match(/:(.*?);/)[1];
        const bin  = atob(b64);
        const arr  = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([arr], { type: mime }));
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch(e) { ATCA.toast('Could not open file.', 'danger'); }
    },

    /** Return aggregate stats for KPI display. */
    summary() {
      const files = _load();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      return {
        total:       files.length,
        total_bytes: files.reduce((s, f) => s + (f.size_bytes || 0), 0),
        this_month:  files.filter(f => f.uploaded_at >= monthStart).length,
        modules:     [...new Set(files.map(f => f.module))].length,
      };
    },
  };
})();

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
