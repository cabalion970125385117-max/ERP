'use strict';
const express = require('express');
const router  = express.Router();
const { getPool, requireAuth, requireRole } = require('../../middleware');

// ── KPI summary ──────────────────────────────────────────────
router.get('/alerts/summary', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM CertificationRegister WHERE status NOT IN ('CANCELLED'))        AS total_certs,
        (SELECT COUNT(*) FROM CertificationRegister WHERE status = 'ACTIVE')                  AS active_certs,
        (SELECT COUNT(*) FROM CertificationRegister WHERE status = 'EXPIRED')                 AS expired_certs,
        (SELECT COUNT(*) FROM CertificationRegister WHERE status = 'RENEWAL_IN_PROGRESS')     AS renewal_in_progress,
        (SELECT COUNT(*) FROM vw_CertExpiry        WHERE expiry_rag = 'OVERDUE')              AS overdue_certs,
        (SELECT COUNT(*) FROM vw_CertExpiry        WHERE expiry_rag = 'DUE_SOON')             AS due_soon_certs,
        (SELECT COUNT(*) FROM CertificationRegister WHERE status NOT IN ('CANCELLED'))        AS total
    `);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Regulatory Bodies ────────────────────────────────────────
router.get('/bodies', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(
      `SELECT * FROM RegulatoryBody WHERE is_active = 1 ORDER BY body_type, body_name`
    );
    res.json({ items: r.recordset, total: r.recordset.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/bodies', requireAuth, requireRole('QA_MANAGER'), async (req, res) => {
  try {
    const { body_name, body_type, country, contact_email } = req.body;
    if (!body_name || !body_type) return res.status(400).json({ message: 'body_name and body_type are required.' });
    const pool = await getPool();
    const r = await pool.request()
      .input('body_name',     body_name)
      .input('body_type',     body_type)
      .input('country',       country       || null)
      .input('contact_email', contact_email || null)
      .query(`INSERT INTO RegulatoryBody (body_name, body_type, country, contact_email)
              OUTPUT INSERTED.*
              VALUES (@body_name, @body_type, @country, @contact_email)`);
    res.status(201).json(r.recordset[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Certificate Register ─────────────────────────────────────
router.get('/certs', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(
      `SELECT * FROM vw_CertExpiry ORDER BY
         CASE expiry_rag WHEN 'OVERDUE' THEN 0 WHEN 'DUE_SOON' THEN 1 ELSE 2 END,
         days_to_expiry`
    );
    res.json({ items: r.recordset, total: r.recordset.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/certs/:id', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const cert = await pool.request()
      .input('id', req.params.id)
      .query(`SELECT * FROM vw_CertExpiry WHERE cert_id = @id`);
    if (!cert.recordset.length) return res.status(404).json({ message: 'Certificate not found.' });
    const actions = await pool.request()
      .input('id', req.params.id)
      .query(`SELECT * FROM CertRenewalAction WHERE cert_id = @id ORDER BY action_date DESC`);
    res.json({ ...cert.recordset[0], renewal_actions: actions.recordset });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/certs', requireAuth, requireRole('ENGINEER'), async (req, res) => {
  try {
    const { cert_name, cert_number, body_id, scope, cert_type, issue_date,
            expiry_date, renewal_lead_days, status, cert_doc_ref, notes } = req.body;
    if (!cert_name || !cert_type || !expiry_date)
      return res.status(400).json({ message: 'cert_name, cert_type and expiry_date are required.' });
    const pool = await getPool();
    const r = await pool.request()
      .input('cert_name',         cert_name)
      .input('cert_number',       cert_number        || null)
      .input('body_id',           body_id            || null)
      .input('scope',             scope              || null)
      .input('cert_type',         cert_type)
      .input('issue_date',        issue_date         || null)
      .input('expiry_date',       expiry_date)
      .input('renewal_lead_days', renewal_lead_days  || 90)
      .input('status',            status             || 'ACTIVE')
      .input('cert_doc_ref',      cert_doc_ref       || null)
      .input('notes',             notes              || null)
      .input('created_by',        req.user.username)
      .query(`INSERT INTO CertificationRegister
                (cert_name, cert_number, body_id, scope, cert_type, issue_date, expiry_date,
                 renewal_lead_days, status, cert_doc_ref, notes, created_by)
              OUTPUT INSERTED.cert_id
              VALUES (@cert_name, @cert_number, @body_id, @scope, @cert_type, @issue_date, @expiry_date,
                      @renewal_lead_days, @status, @cert_doc_ref, @notes, @created_by)`);
    res.status(201).json({ cert_id: r.recordset[0].cert_id, message: 'Certificate created.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/certs/:id', requireAuth, requireRole('ENGINEER'), async (req, res) => {
  try {
    const pool = await getPool();
    const existing = await pool.request()
      .input('id', req.params.id)
      .query(`SELECT * FROM CertificationRegister WHERE cert_id = @id`);
    if (!existing.recordset.length) return res.status(404).json({ message: 'Certificate not found.' });
    const c = existing.recordset[0];
    const { cert_name, cert_number, body_id, scope, cert_type, issue_date,
            expiry_date, renewal_lead_days, status, cert_doc_ref, notes } = req.body;
    await pool.request()
      .input('id',               req.params.id)
      .input('cert_name',        cert_name         || c.cert_name)
      .input('cert_number',      cert_number       !== undefined ? cert_number       : c.cert_number)
      .input('body_id',          body_id           !== undefined ? body_id           : c.body_id)
      .input('scope',            scope             !== undefined ? scope             : c.scope)
      .input('cert_type',        cert_type         || c.cert_type)
      .input('issue_date',       issue_date        !== undefined ? issue_date        : c.issue_date)
      .input('expiry_date',      expiry_date       || c.expiry_date)
      .input('renewal_lead_days',renewal_lead_days !== undefined ? renewal_lead_days : c.renewal_lead_days)
      .input('status',           status            || c.status)
      .input('cert_doc_ref',     cert_doc_ref      !== undefined ? cert_doc_ref      : c.cert_doc_ref)
      .input('notes',            notes             !== undefined ? notes             : c.notes)
      .query(`UPDATE CertificationRegister SET
                cert_name = @cert_name, cert_number = @cert_number, body_id = @body_id,
                scope = @scope, cert_type = @cert_type, issue_date = @issue_date,
                expiry_date = @expiry_date, renewal_lead_days = @renewal_lead_days,
                status = @status, cert_doc_ref = @cert_doc_ref, notes = @notes,
                updated_at = GETDATE()
              WHERE cert_id = @id`);
    res.json({ message: 'Certificate updated.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Renewal Actions ──────────────────────────────────────────
router.get('/renewal-actions', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    let q = `SELECT a.*, c.cert_name, c.cert_type, b.body_name
             FROM CertRenewalAction a
             JOIN CertificationRegister c ON a.cert_id = c.cert_id
             LEFT JOIN RegulatoryBody b ON c.body_id = b.body_id`;
    const req2 = pool.request();
    if (req.query.cert_id) {
      q += ` WHERE a.cert_id = @cert_id`;
      req2.input('cert_id', req.query.cert_id);
    }
    q += ` ORDER BY a.action_date DESC`;
    const r = await req2.query(q);
    res.json({ items: r.recordset, total: r.recordset.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/renewal-actions', requireAuth, requireRole('SUPERVISOR'), async (req, res) => {
  try {
    const { cert_id, action_type, due_date, notes } = req.body;
    if (!cert_id || !action_type) return res.status(400).json({ message: 'cert_id and action_type are required.' });
    const pool = await getPool();
    const r = await pool.request()
      .input('cert_id',      cert_id)
      .input('action_type',  action_type)
      .input('due_date',     due_date || null)
      .input('performed_by', req.user.full_name || req.user.username)
      .input('notes',        notes    || null)
      .query(`INSERT INTO CertRenewalAction (cert_id, action_type, due_date, performed_by, notes)
              OUTPUT INSERTED.*
              VALUES (@cert_id, @action_type, @due_date, @performed_by, @notes)`);
    res.status(201).json(r.recordset[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/renewal-actions/:id', requireAuth, requireRole('SUPERVISOR'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('id',     req.params.id)
      .input('status', status || 'OPEN')
      .input('notes',  notes  || null)
      .query(`UPDATE CertRenewalAction SET status = @status, notes = COALESCE(@notes, notes) WHERE action_id = @id`);
    res.json({ message: 'Action updated.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
