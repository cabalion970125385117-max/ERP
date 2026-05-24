/**
 * ATCA-ERP v1.0 — MOD-01 Risk Register Routes
 * AS9100D §6.1 — Actions to Address Risks and Opportunities
 *
 * GET    /api/v1/mod01/risks           — list (filters: type, status, level)
 * GET    /api/v1/mod01/risks/:id       — single risk
 * POST   /api/v1/mod01/risks           — create (ENGINEER+)
 * PUT    /api/v1/mod01/risks/:id       — update (ENGINEER+)
 * DELETE /api/v1/mod01/risks/:id       — soft-delete (QA_MANAGER+)
 */

'use strict';

const express = require('express');
const router  = express.Router();
const { query, sql } = require('../../config/db');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* -------------------------------------------------------
   GET / — List risks with filters
------------------------------------------------------- */
router.get('/', async (req, res) => {
  try {
    const { type, status, level, process_area, limit = 100, offset = 0 } = req.query;

    let where = 'WHERE r.is_active = 1';
    const params = [];

    if (type) {
      where += ' AND r.risk_type = @type';
      params.push({ name: 'type', type: sql.NVarChar(12), value: type });
    }
    if (status) {
      where += ' AND r.status = @status';
      params.push({ name: 'status', type: sql.NVarChar(12), value: status });
    }
    if (process_area) {
      where += ' AND r.process_area = @process_area';
      params.push({ name: 'process_area', type: sql.NVarChar(50), value: process_area });
    }

    // Level filter (computed from score)
    let havingClause = '';
    if (level === 'HIGH')   havingClause = 'AND (r.likelihood_pre * r.severity_pre) >= 15';
    if (level === 'MEDIUM') havingClause = 'AND (r.likelihood_pre * r.severity_pre) BETWEEN 8 AND 14';
    if (level === 'LOW')    havingClause = 'AND (r.likelihood_pre * r.severity_pre) < 8';

    const rows = await query(`
      SELECT
        r.risk_id, r.risk_ref, r.risk_type, r.process_area,
        r.description, r.cause, r.consequence, r.treatment,
        r.likelihood_pre,  r.severity_pre,
        r.likelihood_post, r.severity_post,
        (r.likelihood_pre  * r.severity_pre)  AS risk_score_pre,
        (r.likelihood_post * r.severity_post) AS risk_score_post,
        CASE
          WHEN (r.likelihood_pre * r.severity_pre) >= 15 THEN 'HIGH'
          WHEN (r.likelihood_pre * r.severity_pre) >= 8  THEN 'MEDIUM'
          ELSE 'LOW'
        END AS risk_level_pre,
        r.status, r.review_date, r.as9100d_clause, r.fmea_ref,
        u_owner.full_name   AS owner_name,
        u_created.full_name AS created_by_name,
        r.created_at, r.updated_at
      FROM dbo.RiskRegister r
      LEFT JOIN dbo.Users u_owner   ON u_owner.user_id   = r.owner_user_id
      LEFT JOIN dbo.Users u_created ON u_created.user_id = r.created_by
      ${where} ${havingClause}
      ORDER BY (r.likelihood_pre * r.severity_pre) DESC, r.risk_ref
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      ...params,
      { name: 'limit',  type: sql.Int, value: parseInt(limit,  10) },
      { name: 'offset', type: sql.Int, value: parseInt(offset, 10) },
    ]);

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM dbo.RiskRegister r ${where} ${havingClause}`, params
    );

    res.json({ items: rows, total: countRows[0].total });
  } catch (err) {
    console.error('[risks/list]', err.message);
    res.status(500).json({ message: 'Error fetching risks.' });
  }
});

/* -------------------------------------------------------
   GET /:id
------------------------------------------------------- */
router.get('/:id', async (req, res) => {
  try {
    const rows = await query(`
      SELECT r.*,
        (r.likelihood_pre  * r.severity_pre)  AS risk_score_pre,
        (r.likelihood_post * r.severity_post) AS risk_score_post,
        CASE
          WHEN (r.likelihood_pre * r.severity_pre) >= 15 THEN 'HIGH'
          WHEN (r.likelihood_pre * r.severity_pre) >= 8  THEN 'MEDIUM'
          ELSE 'LOW'
        END AS risk_level_pre,
        u.full_name AS owner_name
      FROM dbo.RiskRegister r
      LEFT JOIN dbo.Users u ON u.user_id = r.owner_user_id
      WHERE r.risk_id = @id AND r.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id, 10) }]);
    if (!rows.length) return res.status(404).json({ message: 'Risk not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[risks/get]', err.message);
    res.status(500).json({ message: 'Error fetching risk.' });
  }
});

/* -------------------------------------------------------
   POST / — Create risk
------------------------------------------------------- */
router.post('/', requireMinRole('ENGINEER'), async (req, res) => {
  const {
    risk_ref, risk_type, process_area, description, cause, consequence,
    likelihood_pre, severity_pre, treatment, likelihood_post, severity_post,
    status, review_date, as9100d_clause, fmea_ref, owner_user_id
  } = req.body;

  if (!risk_ref || !description || !likelihood_pre || !severity_pre) {
    return res.status(400).json({ message: 'risk_ref, description, likelihood_pre, severity_pre required.' });
  }
  if (likelihood_pre < 1 || likelihood_pre > 5 || severity_pre < 1 || severity_pre > 5) {
    return res.status(400).json({ message: 'Likelihood and severity must be 1–5.' });
  }

  try {
    const result = await query(`
      INSERT INTO dbo.RiskRegister
        (risk_ref, risk_type, process_area, description, cause, consequence,
         likelihood_pre, severity_pre, treatment, likelihood_post, severity_post,
         status, review_date, as9100d_clause, fmea_ref, owner_user_id, created_by)
      OUTPUT INSERTED.risk_id
      VALUES
        (@ref, @rtype, @area, @desc, @cause, @consequence,
         @likepre, @sevpre, @treatment, @likepost, @sevpost,
         @status, @rdate, @clause, @fmea, @owner, @creator)
    `, [
      { name: 'ref',         type: sql.NVarChar(20),      value: risk_ref },
      { name: 'rtype',       type: sql.NVarChar(12),      value: risk_type || 'RISK' },
      { name: 'area',        type: sql.NVarChar(50),      value: process_area || null },
      { name: 'desc',        type: sql.NVarChar(500),     value: description },
      { name: 'cause',       type: sql.NVarChar(300),     value: cause || null },
      { name: 'consequence', type: sql.NVarChar(300),     value: consequence || null },
      { name: 'likepre',     type: sql.TinyInt,           value: parseInt(likelihood_pre,  10) },
      { name: 'sevpre',      type: sql.TinyInt,           value: parseInt(severity_pre,    10) },
      { name: 'treatment',   type: sql.NVarChar(sql.MAX), value: treatment || null },
      { name: 'likepost',    type: sql.TinyInt,           value: likelihood_post ? parseInt(likelihood_post, 10) : null },
      { name: 'sevpost',     type: sql.TinyInt,           value: severity_post  ? parseInt(severity_post,  10) : null },
      { name: 'status',      type: sql.NVarChar(12),      value: status || 'OPEN' },
      { name: 'rdate',       type: sql.Date,              value: review_date ? new Date(review_date) : null },
      { name: 'clause',      type: sql.NVarChar(50),      value: as9100d_clause || null },
      { name: 'fmea',        type: sql.NVarChar(30),      value: fmea_ref || null },
      { name: 'owner',       type: sql.Int,               value: parseInt(owner_user_id, 10) || req.user.userId },
      { name: 'creator',     type: sql.Int,               value: req.user.userId },
    ]);

    const newId = result[0].risk_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'INSERT', tableName: 'RiskRegister', recordId: String(newId), moduleId: 'MOD-01', newValue: req.body });

    res.status(201).json({ risk_id: newId, message: 'Risk created.' });
  } catch (err) {
    if (err.number === 2627) return res.status(409).json({ message: 'Risk reference already exists.' });
    console.error('[risks/create]', err.message);
    res.status(500).json({ message: 'Error creating risk.' });
  }
});

/* -------------------------------------------------------
   PUT /:id — Update risk
------------------------------------------------------- */
router.put('/:id', requireMinRole('ENGINEER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    risk_type, process_area, description, cause, consequence,
    likelihood_pre, severity_pre, treatment, likelihood_post, severity_post,
    status, review_date, as9100d_clause, fmea_ref, owner_user_id
  } = req.body;

  try {
    const old = await query(`SELECT * FROM dbo.RiskRegister WHERE risk_id = @id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!old.length) return res.status(404).json({ message: 'Risk not found.' });

    await query(`
      UPDATE dbo.RiskRegister SET
        risk_type       = @rtype,
        process_area    = @area,
        description     = @desc,
        cause           = @cause,
        consequence     = @consequence,
        likelihood_pre  = @likepre,
        severity_pre    = @sevpre,
        treatment       = @treatment,
        likelihood_post = @likepost,
        severity_post   = @sevpost,
        status          = @status,
        review_date     = @rdate,
        as9100d_clause  = @clause,
        fmea_ref        = @fmea,
        owner_user_id   = @owner,
        updated_at      = GETUTCDATE()
      WHERE risk_id = @id AND is_active = 1
    `, [
      { name: 'id',          type: sql.Int,               value: id },
      { name: 'rtype',       type: sql.NVarChar(12),      value: risk_type || 'RISK' },
      { name: 'area',        type: sql.NVarChar(50),      value: process_area || null },
      { name: 'desc',        type: sql.NVarChar(500),     value: description },
      { name: 'cause',       type: sql.NVarChar(300),     value: cause || null },
      { name: 'consequence', type: sql.NVarChar(300),     value: consequence || null },
      { name: 'likepre',     type: sql.TinyInt,           value: parseInt(likelihood_pre,  10) },
      { name: 'sevpre',      type: sql.TinyInt,           value: parseInt(severity_pre,    10) },
      { name: 'treatment',   type: sql.NVarChar(sql.MAX), value: treatment || null },
      { name: 'likepost',    type: sql.TinyInt,           value: likelihood_post ? parseInt(likelihood_post, 10) : null },
      { name: 'sevpost',     type: sql.TinyInt,           value: severity_post  ? parseInt(severity_post,  10) : null },
      { name: 'status',      type: sql.NVarChar(12),      value: status || 'OPEN' },
      { name: 'rdate',       type: sql.Date,              value: review_date ? new Date(review_date) : null },
      { name: 'clause',      type: sql.NVarChar(50),      value: as9100d_clause || null },
      { name: 'fmea',        type: sql.NVarChar(30),      value: fmea_ref || null },
      { name: 'owner',       type: sql.Int,               value: parseInt(owner_user_id, 10) || req.user.userId },
    ]);

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'RiskRegister', recordId: String(id), moduleId: 'MOD-01',
      oldValue: old[0], newValue: req.body });

    res.json({ message: 'Risk updated.' });
  } catch (err) {
    console.error('[risks/update]', err.message);
    res.status(500).json({ message: 'Error updating risk.' });
  }
});

/* -------------------------------------------------------
   DELETE /:id — Soft delete
------------------------------------------------------- */
router.delete('/:id', requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await query(`UPDATE dbo.RiskRegister SET is_active = 0, updated_at = GETUTCDATE() WHERE risk_id = @id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'SOFT_DELETE', tableName: 'RiskRegister', recordId: String(id), moduleId: 'MOD-01' });
    res.json({ message: 'Risk deactivated.' });
  } catch (err) {
    console.error('[risks/delete]', err.message);
    res.status(500).json({ message: 'Error deactivating risk.' });
  }
});

module.exports = router;
