'use strict';

/**
 * MOD-07 CAPA Routes
 * GET    /api/v1/mod07/capa              — list
 * GET    /api/v1/mod07/capa/:id          — single
 * POST   /api/v1/mod07/capa              — create (ENGINEER+)
 * PUT    /api/v1/mod07/capa/:id          — update (ENGINEER+)
 * PUT    /api/v1/mod07/capa/:id/close    — close (QA_MANAGER+)
 */

const express = require('express');
const router  = express.Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* ---- GET / ---- */
router.get('/', async (req, res) => {
  const { status, capa_type, ncr_id, limit = 50, offset = 0 } = req.query;
  let where = 'WHERE c.is_active = 1';
  const params = [];

  if (status)    { where += ' AND c.status = @status';        params.push({ name: 'status',    type: sql.NVarChar(22), value: status }); }
  if (capa_type) { where += ' AND c.capa_type = @capa_type';  params.push({ name: 'capa_type', type: sql.NVarChar(12), value: capa_type }); }
  if (ncr_id)    { where += ' AND c.ncr_id = @ncr_id';        params.push({ name: 'ncr_id',    type: sql.Int,          value: parseInt(ncr_id, 10) }); }

  try {
    const rows = await query(`
      SELECT
        c.capa_id, c.capa_ref, c.ncr_id, c.capa_type,
        c.root_cause_method, c.status,
        c.target_completion_date, c.actual_completion_date,
        c.effectiveness_result, c.created_at,
        u.full_name AS owner_name,
        n.ncr_ref
      FROM dbo.CAPA c
      LEFT JOIN dbo.Users u ON u.user_id = c.owner_user_id
      LEFT JOIN dbo.NCR   n ON n.ncr_id  = c.ncr_id
      ${where}
      ORDER BY c.target_completion_date, c.capa_id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [...params,
      { name: 'limit',  type: sql.Int, value: parseInt(limit, 10) },
      { name: 'offset', type: sql.Int, value: parseInt(offset, 10) },
    ]);

    const tot = await query(`SELECT COUNT(*) AS total FROM dbo.CAPA c ${where}`, params);
    res.json({ items: rows, total: tot[0].total });
  } catch (err) {
    console.error('[capa/list]', err.message);
    res.status(500).json({ message: 'Error fetching CAPAs.' });
  }
});

/* ---- GET /:id ---- */
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT c.*,
        u_owner.full_name AS owner_name,
        u_cl.full_name    AS closed_by_name,
        n.ncr_ref, n.description AS ncr_description
      FROM dbo.CAPA c
      LEFT JOIN dbo.Users u_owner ON u_owner.user_id = c.owner_user_id
      LEFT JOIN dbo.Users u_cl    ON u_cl.user_id    = c.closed_by
      LEFT JOIN dbo.NCR   n       ON n.ncr_id        = c.ncr_id
      WHERE c.capa_id = @id AND c.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: id }]);
    if (!rows.length) return res.status(404).json({ message: 'CAPA not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[capa/get]', err.message);
    res.status(500).json({ message: 'Error fetching CAPA.' });
  }
});

/* ---- POST / ---- */
router.post('/', requireMinRole('ENGINEER'), async (req, res) => {
  const {
    capa_ref, ncr_id, capa_type, root_cause_method, root_cause_description,
    corrective_action, preventive_action, owner_user_id,
    target_completion_date, effectiveness_review_date,
  } = req.body;

  if (!capa_ref || !target_completion_date) {
    return res.status(400).json({ message: 'capa_ref and target_completion_date required.' });
  }

  try {
    const result = await query(`
      INSERT INTO dbo.CAPA
        (capa_ref, ncr_id, capa_type, root_cause_method, root_cause_description,
         corrective_action, preventive_action, owner_user_id,
         target_completion_date, effectiveness_review_date, created_by)
      OUTPUT INSERTED.capa_id
      VALUES
        (@ref, @ncr_id, @type, @rcm, @rcd,
         @ca, @pa, @owner,
         @tcd, @erd, @creator)
    `, [
      { name: 'ref',     type: sql.NVarChar(20),      value: capa_ref },
      { name: 'ncr_id',  type: sql.Int,               value: ncr_id ? parseInt(ncr_id, 10) : null },
      { name: 'type',    type: sql.NVarChar(12),      value: capa_type || 'CORRECTIVE' },
      { name: 'rcm',     type: sql.NVarChar(15),      value: root_cause_method || null },
      { name: 'rcd',     type: sql.NVarChar(sql.MAX), value: root_cause_description || null },
      { name: 'ca',      type: sql.NVarChar(sql.MAX), value: corrective_action || null },
      { name: 'pa',      type: sql.NVarChar(sql.MAX), value: preventive_action || null },
      { name: 'owner',   type: sql.Int,               value: owner_user_id ? parseInt(owner_user_id, 10) : req.user.userId },
      { name: 'tcd',     type: sql.Date,              value: new Date(target_completion_date) },
      { name: 'erd',     type: sql.Date,              value: effectiveness_review_date ? new Date(effectiveness_review_date) : null },
      { name: 'creator', type: sql.Int,               value: req.user.userId },
    ]);

    const newId = result[0].capa_id;

    // Update linked NCR status if provided
    if (ncr_id) {
      await query(`
        UPDATE dbo.NCR SET status = 'CAPA_IN_PROGRESS', capa_required = 1,
          updated_at = GETUTCDATE()
        WHERE ncr_id = @ncr_id AND status IN ('OPEN','IN_REVIEW','CAPA_REQUIRED')
      `, [{ name: 'ncr_id', type: sql.Int, value: parseInt(ncr_id, 10) }]);
    }

    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'INSERT', tableName: 'CAPA',
      recordId: String(newId), moduleId: 'MOD-07', newValue: req.body });

    res.status(201).json({ capa_id: newId, message: 'CAPA created.' });
  } catch (err) {
    if (err.number === 2627) return res.status(409).json({ message: 'CAPA reference already exists.' });
    console.error('[capa/create]', err.message);
    res.status(500).json({ message: 'Error creating CAPA.' });
  }
});

/* ---- PUT /:id ---- */
router.put('/:id', requireMinRole('ENGINEER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    capa_type, root_cause_method, root_cause_description,
    corrective_action, preventive_action, owner_user_id,
    target_completion_date, actual_completion_date,
    effectiveness_review_date, effectiveness_result, effectiveness_notes, status,
  } = req.body;

  try {
    const old = await query(`SELECT * FROM dbo.CAPA WHERE capa_id = @id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!old.length) return res.status(404).json({ message: 'CAPA not found.' });

    await query(`
      UPDATE dbo.CAPA SET
        capa_type                 = @type,
        root_cause_method         = @rcm,
        root_cause_description    = @rcd,
        corrective_action         = @ca,
        preventive_action         = @pa,
        owner_user_id             = @owner,
        target_completion_date    = @tcd,
        actual_completion_date    = @acd,
        effectiveness_review_date = @erd,
        effectiveness_result      = @eff,
        effectiveness_notes       = @eff_notes,
        status                    = @status,
        updated_at                = GETUTCDATE()
      WHERE capa_id = @id AND is_active = 1
    `, [
      { name: 'id',        type: sql.Int,               value: id },
      { name: 'type',      type: sql.NVarChar(12),      value: capa_type || 'CORRECTIVE' },
      { name: 'rcm',       type: sql.NVarChar(15),      value: root_cause_method || null },
      { name: 'rcd',       type: sql.NVarChar(sql.MAX), value: root_cause_description || null },
      { name: 'ca',        type: sql.NVarChar(sql.MAX), value: corrective_action || null },
      { name: 'pa',        type: sql.NVarChar(sql.MAX), value: preventive_action || null },
      { name: 'owner',     type: sql.Int,               value: owner_user_id ? parseInt(owner_user_id, 10) : old[0].owner_user_id },
      { name: 'tcd',       type: sql.Date,              value: new Date(target_completion_date) },
      { name: 'acd',       type: sql.Date,              value: actual_completion_date ? new Date(actual_completion_date) : null },
      { name: 'erd',       type: sql.Date,              value: effectiveness_review_date ? new Date(effectiveness_review_date) : null },
      { name: 'eff',       type: sql.NVarChar(25),      value: effectiveness_result || null },
      { name: 'eff_notes', type: sql.NVarChar(sql.MAX), value: effectiveness_notes || null },
      { name: 'status',    type: sql.NVarChar(22),      value: status || old[0].status },
    ]);

    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'CAPA',
      recordId: String(id), moduleId: 'MOD-07', oldValue: old[0], newValue: req.body });

    res.json({ message: 'CAPA updated.' });
  } catch (err) {
    console.error('[capa/update]', err.message);
    res.status(500).json({ message: 'Error updating CAPA.' });
  }
});

/* ---- PUT /:id/close ---- */
router.put('/:id/close', requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { effectiveness_result, effectiveness_notes } = req.body;

  if (!effectiveness_result) {
    return res.status(400).json({ message: 'effectiveness_result required to close CAPA.' });
  }

  try {
    await query(`
      UPDATE dbo.CAPA SET
        status = 'CLOSED',
        effectiveness_result = @eff,
        effectiveness_notes  = @notes,
        closed_by = @uid,
        closed_at = GETUTCDATE(),
        actual_completion_date = COALESCE(actual_completion_date, CAST(GETUTCDATE() AS DATE)),
        updated_at = GETUTCDATE()
      WHERE capa_id = @id AND is_active = 1 AND status != 'CLOSED'
    `, [
      { name: 'id',    type: sql.Int,               value: id },
      { name: 'eff',   type: sql.NVarChar(25),      value: effectiveness_result },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: effectiveness_notes || null },
      { name: 'uid',   type: sql.Int,               value: req.user.userId },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'CAPA',
      recordId: String(id), moduleId: 'MOD-07', newValue: { status: 'CLOSED', effectiveness_result } });
    res.json({ message: 'CAPA closed.' });
  } catch (err) {
    console.error('[capa/close]', err.message);
    res.status(500).json({ message: 'Error closing CAPA.' });
  }
});

module.exports = router;
