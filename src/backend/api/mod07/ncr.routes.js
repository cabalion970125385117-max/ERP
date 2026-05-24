'use strict';

/**
 * MOD-07 NCR Routes
 * GET    /api/v1/mod07/ncr              — list (filters: status, type, source, process_area)
 * GET    /api/v1/mod07/ncr/:id          — single NCR with CAPA list
 * POST   /api/v1/mod07/ncr              — create (NDT_INSPECTOR+)
 * PUT    /api/v1/mod07/ncr/:id          — update (ENGINEER+)
 * PUT    /api/v1/mod07/ncr/:id/close    — close NCR (QA_MANAGER+)
 * DELETE /api/v1/mod07/ncr/:id          — soft-delete (QA_MANAGER+)
 */

const express = require('express');
const router  = express.Router();
const { query, sql } = require('../../config/db');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* ---- GET / ---- */
router.get('/', async (req, res) => {
  const { status, type, source, process_area, limit = 50, offset = 0 } = req.query;
  let where = 'WHERE n.is_active = 1';
  const params = [];

  if (status)       { where += ' AND n.status = @status';           params.push({ name: 'status',  type: sql.NVarChar(20), value: status }); }
  if (type)         { where += ' AND n.ncr_type = @type';           params.push({ name: 'type',    type: sql.NVarChar(15), value: type }); }
  if (source)       { where += ' AND n.source = @source';           params.push({ name: 'source',  type: sql.NVarChar(20), value: source }); }
  if (process_area) { where += ' AND n.process_area = @process_area'; params.push({ name: 'process_area', type: sql.NVarChar(50), value: process_area }); }

  try {
    const rows = await query(`
      SELECT
        n.ncr_id, n.ncr_ref, n.ncr_type, n.source, n.detected_date,
        n.process_area, n.description, n.part_number, n.lot_number,
        n.work_order_ref, n.disposition, n.capa_required, n.status,
        n.closed_date, n.created_at,
        u_det.full_name AS detected_by_name,
        (SELECT COUNT(*) FROM dbo.CAPA c WHERE c.ncr_id = n.ncr_id AND c.is_active = 1
            AND c.status NOT IN ('CLOSED','CANCELLED')) AS open_capa_count
      FROM dbo.NCR n
      LEFT JOIN dbo.Users u_det ON u_det.user_id = n.detected_by
      ${where}
      ORDER BY n.detected_date DESC, n.ncr_id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [...params,
      { name: 'limit',  type: sql.Int, value: parseInt(limit, 10) },
      { name: 'offset', type: sql.Int, value: parseInt(offset, 10) },
    ]);

    const tot = await query(
      `SELECT COUNT(*) AS total FROM dbo.NCR n ${where}`, params
    );
    res.json({ items: rows, total: tot[0].total });
  } catch (err) {
    console.error('[ncr/list]', err.message);
    res.status(500).json({ message: 'Error fetching NCRs.' });
  }
});

/* ---- GET /:id ---- */
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT n.*,
        u_det.full_name  AS detected_by_name,
        u_disp.full_name AS disposition_by_name,
        u_cl.full_name   AS closed_by_name
      FROM dbo.NCR n
      LEFT JOIN dbo.Users u_det  ON u_det.user_id  = n.detected_by
      LEFT JOIN dbo.Users u_disp ON u_disp.user_id = n.disposition_by
      LEFT JOIN dbo.Users u_cl   ON u_cl.user_id   = n.closed_by
      WHERE n.ncr_id = @id AND n.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: id }]);
    if (!rows.length) return res.status(404).json({ message: 'NCR not found.' });

    const capas = await query(`
      SELECT c.capa_id, c.capa_ref, c.capa_type, c.status,
             c.target_completion_date, c.actual_completion_date,
             c.effectiveness_result, u.full_name AS owner_name
      FROM dbo.CAPA c
      LEFT JOIN dbo.Users u ON u.user_id = c.owner_user_id
      WHERE c.ncr_id = @id AND c.is_active = 1
      ORDER BY c.created_at
    `, [{ name: 'id', type: sql.Int, value: id }]);

    res.json({ ...rows[0], capas });
  } catch (err) {
    console.error('[ncr/get]', err.message);
    res.status(500).json({ message: 'Error fetching NCR.' });
  }
});

/* ---- POST / ---- */
router.post('/', requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  const {
    ncr_ref, ncr_type, source, detected_date, process_area,
    description, part_number, lot_number, work_order_ref, customer_ref,
    immediate_action, capa_required,
  } = req.body;

  if (!ncr_ref || !ncr_type || !detected_date || !description) {
    return res.status(400).json({ message: 'ncr_ref, ncr_type, detected_date, description required.' });
  }

  try {
    const result = await query(`
      INSERT INTO dbo.NCR
        (ncr_ref, ncr_type, source, detected_date, process_area, description,
         part_number, lot_number, work_order_ref, customer_ref,
         immediate_action, capa_required, detected_by, created_by)
      OUTPUT INSERTED.ncr_id
      VALUES
        (@ref, @type, @source, @ddate, @area, @desc,
         @pn, @lot, @wo, @custref,
         @imm, @capa_req, @detected_by, @creator)
    `, [
      { name: 'ref',         type: sql.NVarChar(20),      value: ncr_ref },
      { name: 'type',        type: sql.NVarChar(15),      value: ncr_type },
      { name: 'source',      type: sql.NVarChar(20),      value: source || 'INTERNAL' },
      { name: 'ddate',       type: sql.Date,              value: new Date(detected_date) },
      { name: 'area',        type: sql.NVarChar(50),      value: process_area || null },
      { name: 'desc',        type: sql.NVarChar(sql.MAX), value: description },
      { name: 'pn',          type: sql.NVarChar(100),     value: part_number || null },
      { name: 'lot',         type: sql.NVarChar(50),      value: lot_number || null },
      { name: 'wo',          type: sql.NVarChar(50),      value: work_order_ref || null },
      { name: 'custref',     type: sql.NVarChar(100),     value: customer_ref || null },
      { name: 'imm',         type: sql.NVarChar(sql.MAX), value: immediate_action || null },
      { name: 'capa_req',    type: sql.Bit,               value: capa_required ? 1 : 0 },
      { name: 'detected_by', type: sql.Int,               value: req.user.userId },
      { name: 'creator',     type: sql.Int,               value: req.user.userId },
    ]);

    const newId = result[0].ncr_id;
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'INSERT', tableName: 'NCR',
      recordId: String(newId), moduleId: 'MOD-07', newValue: req.body });

    res.status(201).json({ ncr_id: newId, message: 'NCR created.' });
  } catch (err) {
    if (err.number === 2627) return res.status(409).json({ message: 'NCR reference already exists.' });
    console.error('[ncr/create]', err.message);
    res.status(500).json({ message: 'Error creating NCR.' });
  }
});

/* ---- PUT /:id ---- */
router.put('/:id', requireMinRole('ENGINEER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    ncr_type, source, detected_date, process_area, description,
    part_number, lot_number, work_order_ref, customer_ref,
    immediate_action, disposition, disposition_rationale, disposition_by,
    disposition_date, capa_required, status,
  } = req.body;

  try {
    const old = await query(`SELECT * FROM dbo.NCR WHERE ncr_id = @id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!old.length) return res.status(404).json({ message: 'NCR not found.' });

    await query(`
      UPDATE dbo.NCR SET
        ncr_type              = @type,
        source                = @source,
        detected_date         = @ddate,
        process_area          = @area,
        description           = @desc,
        part_number           = @pn,
        lot_number            = @lot,
        work_order_ref        = @wo,
        customer_ref          = @custref,
        immediate_action      = @imm,
        disposition           = @disp,
        disposition_rationale = @disp_rat,
        disposition_by        = @disp_by,
        disposition_date      = @disp_date,
        capa_required         = @capa_req,
        status                = @status,
        updated_at            = GETUTCDATE()
      WHERE ncr_id = @id AND is_active = 1
    `, [
      { name: 'id',        type: sql.Int,               value: id },
      { name: 'type',      type: sql.NVarChar(15),      value: ncr_type },
      { name: 'source',    type: sql.NVarChar(20),      value: source || 'INTERNAL' },
      { name: 'ddate',     type: sql.Date,              value: new Date(detected_date) },
      { name: 'area',      type: sql.NVarChar(50),      value: process_area || null },
      { name: 'desc',      type: sql.NVarChar(sql.MAX), value: description },
      { name: 'pn',        type: sql.NVarChar(100),     value: part_number || null },
      { name: 'lot',       type: sql.NVarChar(50),      value: lot_number || null },
      { name: 'wo',        type: sql.NVarChar(50),      value: work_order_ref || null },
      { name: 'custref',   type: sql.NVarChar(100),     value: customer_ref || null },
      { name: 'imm',       type: sql.NVarChar(sql.MAX), value: immediate_action || null },
      { name: 'disp',      type: sql.NVarChar(25),      value: disposition || null },
      { name: 'disp_rat',  type: sql.NVarChar(sql.MAX), value: disposition_rationale || null },
      { name: 'disp_by',   type: sql.Int,               value: disposition_by ? parseInt(disposition_by, 10) : null },
      { name: 'disp_date', type: sql.Date,              value: disposition_date ? new Date(disposition_date) : null },
      { name: 'capa_req',  type: sql.Bit,               value: capa_required ? 1 : 0 },
      { name: 'status',    type: sql.NVarChar(20),      value: status || old[0].status },
    ]);

    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'NCR',
      recordId: String(id), moduleId: 'MOD-07', oldValue: old[0], newValue: req.body });

    res.json({ message: 'NCR updated.' });
  } catch (err) {
    console.error('[ncr/update]', err.message);
    res.status(500).json({ message: 'Error updating NCR.' });
  }
});

/* ---- PUT /:id/close ---- */
router.put('/:id/close', requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await query(`
      UPDATE dbo.NCR SET status = 'CLOSED', closed_date = CAST(GETUTCDATE() AS DATE),
        closed_by = @uid, updated_at = GETUTCDATE()
      WHERE ncr_id = @id AND is_active = 1 AND status NOT IN ('CLOSED','CANCELLED')
    `, [
      { name: 'id',  type: sql.Int, value: id },
      { name: 'uid', type: sql.Int, value: req.user.userId },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'NCR',
      recordId: String(id), moduleId: 'MOD-07', newValue: { status: 'CLOSED' } });
    res.json({ message: 'NCR closed.' });
  } catch (err) {
    console.error('[ncr/close]', err.message);
    res.status(500).json({ message: 'Error closing NCR.' });
  }
});

/* ---- DELETE /:id ---- */
router.delete('/:id', requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await query(`UPDATE dbo.NCR SET is_active = 0, updated_at = GETUTCDATE() WHERE ncr_id = @id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'SOFT_DELETE', tableName: 'NCR',
      recordId: String(id), moduleId: 'MOD-07' });
    res.json({ message: 'NCR deactivated.' });
  } catch (err) {
    console.error('[ncr/delete]', err.message);
    res.status(500).json({ message: 'Error deactivating NCR.' });
  }
});

module.exports = router;
