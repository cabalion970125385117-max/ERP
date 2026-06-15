/**
 * ATCA-ERP v1.0 — MOD-01 Management Review Routes
 * AS9100D §9.3 — Management Review
 *
 * GET    /api/v1/mod01/reviews                      — list reviews
 * GET    /api/v1/mod01/reviews/:id                  — single review
 * POST   /api/v1/mod01/reviews                      — create (QA_MANAGER+)
 * PUT    /api/v1/mod01/reviews/:id                  — update (QA_MANAGER+)
 * PUT    /api/v1/mod01/reviews/:id/complete          — mark complete + approve
 * POST   /api/v1/mod01/reviews/:id/attendees         — add attendee
 * POST   /api/v1/mod01/reviews/:id/actions           — add action item
 * GET    /api/v1/mod01/reviews/:id/actions           — list action items
 * PUT    /api/v1/mod01/reviews/actions/:actionId     — update action item
 */

'use strict';

const express = require('express');
const router  = express.Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* -------------------------------------------------------
   GET / — List reviews
------------------------------------------------------- */
router.get('/', async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    let where = 'WHERE r.is_active = 1';
    const params = [];

    if (status) {
      where += ' AND r.status = @status';
      params.push({ name: 'status', type: sql.NVarChar(10), value: status });
    }

    const rows = await query(`
      SELECT
        r.review_id, r.review_ref, r.review_type, r.review_date,
        r.location, r.status, r.created_at,
        u_chair.full_name    AS chaired_by_name,
        u_approved.full_name AS approved_by_name,
        -- Count open actions
        (SELECT COUNT(*) FROM dbo.MgmtReviewAction a
         WHERE a.review_id = r.review_id AND a.status IN ('OPEN','IN_PROGRESS')) AS open_actions,
        -- Attendee count
        (SELECT COUNT(*) FROM dbo.MgmtReviewAttendee att
         WHERE att.review_id = r.review_id AND att.attended = 1) AS attendee_count
      FROM dbo.ManagementReview r
      LEFT JOIN dbo.Users u_chair    ON u_chair.user_id    = r.chaired_by
      LEFT JOIN dbo.Users u_approved ON u_approved.user_id = r.approved_by
      ${where}
      ORDER BY r.review_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      ...params,
      { name: 'limit',  type: sql.Int, value: parseInt(limit,  10) },
      { name: 'offset', type: sql.Int, value: parseInt(offset, 10) },
    ]);

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM dbo.ManagementReview r ${where}`, params
    );

    res.json({ items: rows, total: countRows[0].total });
  } catch (err) {
    console.error('[reviews/list]', err.message);
    res.status(500).json({ message: 'Error fetching reviews.' });
  }
});

/* -------------------------------------------------------
   GET /:id — Full review with inputs/outputs
------------------------------------------------------- */
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT r.*,
        u_chair.full_name    AS chaired_by_name,
        u_approved.full_name AS approved_by_name
      FROM dbo.ManagementReview r
      LEFT JOIN dbo.Users u_chair    ON u_chair.user_id    = r.chaired_by
      LEFT JOIN dbo.Users u_approved ON u_approved.user_id = r.approved_by
      WHERE r.review_id = @id AND r.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: id }]);
    if (!rows.length) return res.status(404).json({ message: 'Review not found.' });

    // Attendees
    const attendees = await query(`
      SELECT att.*, u.full_name, u.role AS user_role
      FROM dbo.MgmtReviewAttendee att
      LEFT JOIN dbo.Users u ON u.user_id = att.user_id
      WHERE att.review_id = @id
    `, [{ name: 'id', type: sql.Int, value: id }]);

    // Actions
    const actions = await query(`
      SELECT a.*, u.full_name AS owner_name
      FROM dbo.MgmtReviewAction a
      LEFT JOIN dbo.Users u ON u.user_id = a.owner_user_id
      WHERE a.review_id = @id
      ORDER BY a.due_date
    `, [{ name: 'id', type: sql.Int, value: id }]);

    res.json({ ...rows[0], attendees, actions });
  } catch (err) {
    console.error('[reviews/get]', err.message);
    res.status(500).json({ message: 'Error fetching review.' });
  }
});

/* -------------------------------------------------------
   POST / — Create review
------------------------------------------------------- */
router.post('/', requireMinRole('QA_MANAGER'), async (req, res) => {
  const { review_ref, review_type, review_date, location, chaired_by } = req.body;
  if (!review_ref || !review_date) {
    return res.status(400).json({ message: 'review_ref and review_date are required.' });
  }

  try {
    const result = await query(`
      INSERT INTO dbo.ManagementReview
        (review_ref, review_type, review_date, location, chaired_by, status, created_by)
      OUTPUT INSERTED.review_id
      VALUES (@ref, @rtype, @rdate, @loc, @chair, 'PLANNED', @creator)
    `, [
      { name: 'ref',     type: sql.NVarChar(20),  value: review_ref },
      { name: 'rtype',   type: sql.NVarChar(12),  value: review_type || 'Annual' },
      { name: 'rdate',   type: sql.Date,           value: new Date(review_date) },
      { name: 'loc',     type: sql.NVarChar(100), value: location || 'ATCA Board Room' },
      { name: 'chair',   type: sql.Int,            value: parseInt(chaired_by, 10) || req.user.userId },
      { name: 'creator', type: sql.Int,            value: req.user.userId },
    ]);

    const newId = result[0].review_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'INSERT', tableName: 'ManagementReview', recordId: String(newId), moduleId: 'MOD-01', newValue: req.body });

    res.status(201).json({ review_id: newId, message: 'Management review created.' });
  } catch (err) {
    if (err.number === 2627) return res.status(409).json({ message: 'Review reference already exists.' });
    console.error('[reviews/create]', err.message);
    res.status(500).json({ message: 'Error creating review.' });
  }
});

/* -------------------------------------------------------
   PUT /actions/:actionId — Update action item status
   MUST be defined before PUT /:id to prevent route shadowing
------------------------------------------------------- */
router.put('/actions/:actionId', async (req, res) => {
  const actionId = parseInt(req.params.actionId, 10);
  const { status, completion_date, evidence } = req.body;
  try {
    await query(`
      UPDATE dbo.MgmtReviewAction SET
        status          = @status,
        completion_date = @cdate,
        evidence        = @evidence,
        updated_at      = GETUTCDATE()
      WHERE action_id = @id
    `, [
      { name: 'id',       type: sql.Int,               value: actionId },
      { name: 'status',   type: sql.NVarChar(12),      value: status || 'OPEN' },
      { name: 'cdate',    type: sql.Date,              value: completion_date ? new Date(completion_date) : null },
      { name: 'evidence', type: sql.NVarChar(sql.MAX), value: evidence || null },
    ]);
    res.json({ message: 'Action item updated.' });
  } catch (err) {
    console.error('[reviews/actions/update]', err.message);
    res.status(500).json({ message: 'Error updating action item.' });
  }
});

/* -------------------------------------------------------
   PUT /:id — Update review inputs/outputs/minutes
------------------------------------------------------- */
router.put('/:id', requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    review_type, review_date, location, chaired_by, status,
    input_audit_results, input_customer_feedback, input_process_performance,
    input_ncr_capa_status, input_prev_actions, input_risks_opportunities,
    input_resource_adequacy,
    output_improvement_opps, output_qms_changes, output_resource_needs,
    minutes_text
  } = req.body;

  try {
    const old = await query(`SELECT * FROM dbo.ManagementReview WHERE review_id = @id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!old.length) return res.status(404).json({ message: 'Review not found.' });
    if (old[0].status === 'COMPLETED') {
      return res.status(400).json({ message: 'Completed reviews cannot be edited.' });
    }

    await query(`
      UPDATE dbo.ManagementReview SET
        review_type                = @rtype,
        review_date                = @rdate,
        location                   = @loc,
        chaired_by                 = @chair,
        status                     = @status,
        input_audit_results        = @i_audit,
        input_customer_feedback    = @i_cust,
        input_process_performance  = @i_proc,
        input_ncr_capa_status      = @i_ncr,
        input_prev_actions         = @i_prev,
        input_risks_opportunities  = @i_risk,
        input_resource_adequacy    = @i_res,
        output_improvement_opps    = @o_impr,
        output_qms_changes         = @o_qms,
        output_resource_needs      = @o_res,
        minutes_text               = @minutes,
        updated_at                 = GETUTCDATE()
      WHERE review_id = @id AND is_active = 1
    `, [
      { name: 'id',      type: sql.Int,               value: id },
      { name: 'rtype',   type: sql.NVarChar(12),      value: review_type || 'Annual' },
      { name: 'rdate',   type: sql.Date,              value: new Date(review_date) },
      { name: 'loc',     type: sql.NVarChar(100),     value: location || null },
      { name: 'chair',   type: sql.Int,               value: parseInt(chaired_by, 10) || req.user.userId },
      { name: 'status',  type: sql.NVarChar(10),      value: status || 'PLANNED' },
      { name: 'i_audit', type: sql.NVarChar(sql.MAX), value: input_audit_results || null },
      { name: 'i_cust',  type: sql.NVarChar(sql.MAX), value: input_customer_feedback || null },
      { name: 'i_proc',  type: sql.NVarChar(sql.MAX), value: input_process_performance || null },
      { name: 'i_ncr',   type: sql.NVarChar(sql.MAX), value: input_ncr_capa_status || null },
      { name: 'i_prev',  type: sql.NVarChar(sql.MAX), value: input_prev_actions || null },
      { name: 'i_risk',  type: sql.NVarChar(sql.MAX), value: input_risks_opportunities || null },
      { name: 'i_res',   type: sql.NVarChar(sql.MAX), value: input_resource_adequacy || null },
      { name: 'o_impr',  type: sql.NVarChar(sql.MAX), value: output_improvement_opps || null },
      { name: 'o_qms',   type: sql.NVarChar(sql.MAX), value: output_qms_changes || null },
      { name: 'o_res',   type: sql.NVarChar(sql.MAX), value: output_resource_needs || null },
      { name: 'minutes', type: sql.NVarChar(sql.MAX), value: minutes_text || null },
    ]);

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'ManagementReview', recordId: String(id), moduleId: 'MOD-01',
      oldValue: old[0], newValue: req.body });

    res.json({ message: 'Review updated.' });
  } catch (err) {
    console.error('[reviews/update]', err.message);
    res.status(500).json({ message: 'Error updating review.' });
  }
});

/* -------------------------------------------------------
   PUT /:id/complete — Approve and lock review
------------------------------------------------------- */
router.put('/:id/complete', requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await query(`
      UPDATE dbo.ManagementReview
      SET status = 'COMPLETED', approved_by = @userId, approved_at = GETUTCDATE(), updated_at = GETUTCDATE()
      WHERE review_id = @id AND is_active = 1
    `, [
      { name: 'id',     type: sql.Int, value: id },
      { name: 'userId', type: sql.Int, value: req.user.userId },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'ManagementReview', recordId: String(id), moduleId: 'MOD-01',
      newValue: { status: 'COMPLETED' } });
    res.json({ message: 'Review marked complete and locked.' });
  } catch (err) {
    console.error('[reviews/complete]', err.message);
    res.status(500).json({ message: 'Error completing review.' });
  }
});

/* -------------------------------------------------------
   POST /:id/attendees — Add attendee
------------------------------------------------------- */
router.post('/:id/attendees', requireMinRole('QA_MANAGER'), async (req, res) => {
  const reviewId = parseInt(req.params.id, 10);
  const { user_id, role_at_review, attended } = req.body;
  try {
    await query(`
      INSERT INTO dbo.MgmtReviewAttendee (review_id, user_id, role_at_review, attended)
      VALUES (@rid, @uid, @role, @attended)
    `, [
      { name: 'rid',      type: sql.Int,           value: reviewId },
      { name: 'uid',      type: sql.Int,           value: parseInt(user_id, 10) },
      { name: 'role',     type: sql.NVarChar(50),  value: role_at_review || null },
      { name: 'attended', type: sql.Bit,           value: attended !== false ? 1 : 0 },
    ]);
    res.status(201).json({ message: 'Attendee added.' });
  } catch (err) {
    console.error('[reviews/attendees]', err.message);
    res.status(500).json({ message: 'Error adding attendee.' });
  }
});

/* -------------------------------------------------------
   POST /:id/actions — Add action item
------------------------------------------------------- */
router.post('/:id/actions', requireMinRole('QA_MANAGER'), async (req, res) => {
  const reviewId = parseInt(req.params.id, 10);
  const { action_ref, description, owner_user_id, due_date } = req.body;
  if (!action_ref || !description || !due_date) {
    return res.status(400).json({ message: 'action_ref, description, due_date required.' });
  }
  try {
    const result = await query(`
      INSERT INTO dbo.MgmtReviewAction (review_id, action_ref, description, owner_user_id, due_date)
      OUTPUT INSERTED.action_id
      VALUES (@rid, @ref, @desc, @owner, @ddate)
    `, [
      { name: 'rid',   type: sql.Int,           value: reviewId },
      { name: 'ref',   type: sql.NVarChar(25),  value: action_ref },
      { name: 'desc',  type: sql.NVarChar(500), value: description },
      { name: 'owner', type: sql.Int,           value: parseInt(owner_user_id, 10) || req.user.userId },
      { name: 'ddate', type: sql.Date,          value: new Date(due_date) },
    ]);
    res.status(201).json({ action_id: result[0].action_id, message: 'Action item created.' });
  } catch (err) {
    console.error('[reviews/actions/create]', err.message);
    res.status(500).json({ message: 'Error creating action item.' });
  }
});

/* -------------------------------------------------------
   GET /:id/actions — List action items
------------------------------------------------------- */
router.get('/:id/actions', async (req, res) => {
  const reviewId = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT a.*, u.full_name AS owner_name
      FROM dbo.MgmtReviewAction a
      LEFT JOIN dbo.Users u ON u.user_id = a.owner_user_id
      WHERE a.review_id = @rid
      ORDER BY a.due_date
    `, [{ name: 'rid', type: sql.Int, value: reviewId }]);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[reviews/actions/list]', err.message);
    res.status(500).json({ message: 'Error fetching actions.' });
  }
});

module.exports = router;
