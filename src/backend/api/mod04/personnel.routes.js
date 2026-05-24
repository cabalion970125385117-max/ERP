'use strict';

/**
 * MOD-04 Personnel Routes
 * GET  /api/v1/mod04/personnel       — list
 * GET  /api/v1/mod04/personnel/:id   — single with certs + eye exams + training
 * POST /api/v1/mod04/personnel       — create (SUPERVISOR+)
 * PUT  /api/v1/mod04/personnel/:id   — update (SUPERVISOR+)
 *
 * Eye Exam sub-routes:
 * POST /api/v1/mod04/personnel/:id/eye-exams   — record eye exam
 * GET  /api/v1/mod04/personnel/:id/eye-exams   — eye exam history
 *
 * Training sub-routes:
 * POST /api/v1/mod04/personnel/:id/training    — log training hours
 * GET  /api/v1/mod04/personnel/:id/training    — training history + totals
 */

const express = require('express');
const router  = express.Router();
const { query, sql } = require('../../config/db');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* ---- GET / ---- */
router.get('/', async (req, res) => {
  const { designation, is_active = '1' } = req.query;
  let where = `WHERE p.is_active = ${is_active === '0' ? 0 : 1}`;
  const params = [];
  if (designation) {
    where += ' AND p.designation = @desig';
    params.push({ name: 'desig', type: sql.NVarChar(20), value: designation });
  }

  try {
    const rows = await query(`
      SELECT
        p.personnel_id, p.employee_id, p.full_name,
        p.designation, p.employment_type, p.ndt_org_role,
        p.date_joined, p.is_active,
        -- Latest eye exam
        ey.exam_date AS eye_exam_date, ey.expiry_date AS eye_exam_expiry,
        ey.result AS eye_exam_result,
        DATEDIFF(DAY, GETUTCDATE(), ey.expiry_date) AS eye_days_remaining,
        -- Active cert count
        (SELECT COUNT(*) FROM dbo.NdtCertification c
          WHERE c.personnel_id = p.personnel_id AND c.is_active = 1 AND c.status = 'ACTIVE') AS active_certs
      FROM dbo.Personnel p
      LEFT JOIN dbo.EyeExam ey ON ey.exam_id = (
        SELECT TOP 1 exam_id FROM dbo.EyeExam
        WHERE personnel_id = p.personnel_id AND is_active = 1
        ORDER BY exam_date DESC
      )
      ${where}
      ORDER BY p.designation, p.full_name
    `, params);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[personnel/list]', err.message);
    res.status(500).json({ message: 'Error fetching personnel.' });
  }
});

/* ---- GET /:id ---- */
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT p.* FROM dbo.Personnel p WHERE p.personnel_id = @id
    `, [{ name: 'id', type: sql.Int, value: id }]);
    if (!rows.length) return res.status(404).json({ message: 'Personnel not found.' });

    const certs = await query(`
      SELECT c.*, u.full_name AS created_by_name
      FROM dbo.NdtCertification c
      LEFT JOIN dbo.Users u ON u.user_id = c.created_by
      WHERE c.personnel_id = @id AND c.is_active = 1
      ORDER BY c.method, c.issue_date DESC
    `, [{ name: 'id', type: sql.Int, value: id }]);

    const eyes = await query(`
      SELECT e.* FROM dbo.EyeExam e
      WHERE e.personnel_id = @id AND e.is_active = 1
      ORDER BY e.exam_date DESC
    `, [{ name: 'id', type: sql.Int, value: id }]);

    const training = await query(`
      SELECT method, training_type,
             SUM(hours) AS total_hours,
             COUNT(*) AS session_count,
             MAX(training_date) AS last_training_date
      FROM dbo.TrainingRecord
      WHERE personnel_id = @id
      GROUP BY method, training_type
      ORDER BY method, training_type
    `, [{ name: 'id', type: sql.Int, value: id }]);

    res.json({ ...rows[0], certifications: certs, eye_exams: eyes, training_summary: training });
  } catch (err) {
    console.error('[personnel/get]', err.message);
    res.status(500).json({ message: 'Error fetching personnel detail.' });
  }
});

/* ---- POST / ---- */
router.post('/', requireMinRole('SUPERVISOR'), async (req, res) => {
  const { employee_id, full_name, designation, employment_type, date_joined, ndt_org_role, email } = req.body;
  if (!employee_id || !full_name || !date_joined) {
    return res.status(400).json({ message: 'employee_id, full_name, date_joined required.' });
  }
  try {
    const result = await query(`
      INSERT INTO dbo.Personnel (employee_id, full_name, designation, employment_type,
        date_joined, ndt_org_role, email, created_by)
      OUTPUT INSERTED.personnel_id
      VALUES (@eid, @name, @desig, @emp_type, @dj, @role, @email, @creator)
    `, [
      { name: 'eid',      type: sql.NVarChar(15),  value: employee_id },
      { name: 'name',     type: sql.NVarChar(100), value: full_name },
      { name: 'desig',    type: sql.NVarChar(20),  value: designation || 'INSPECTOR' },
      { name: 'emp_type', type: sql.NVarChar(12),  value: employment_type || 'PERMANENT' },
      { name: 'dj',       type: sql.Date,          value: new Date(date_joined) },
      { name: 'role',     type: sql.NVarChar(100), value: ndt_org_role || null },
      { name: 'email',    type: sql.NVarChar(100), value: email || null },
      { name: 'creator',  type: sql.Int,           value: req.user.userId },
    ]);
    const newId = result[0].personnel_id;
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'INSERT', tableName: 'Personnel',
      recordId: String(newId), moduleId: 'MOD-04', newValue: req.body });
    res.status(201).json({ personnel_id: newId, message: 'Personnel created.' });
  } catch (err) {
    if (err.number === 2627) return res.status(409).json({ message: 'Employee ID already exists.' });
    console.error('[personnel/create]', err.message);
    res.status(500).json({ message: 'Error creating personnel.' });
  }
});

/* ---- PUT /:id ---- */
router.put('/:id', requireMinRole('SUPERVISOR'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { full_name, designation, employment_type, date_joined, date_left, ndt_org_role, email, is_active } = req.body;
  try {
    await query(`
      UPDATE dbo.Personnel SET
        full_name       = @name,
        designation     = @desig,
        employment_type = @emp_type,
        date_joined     = @dj,
        date_left       = @dl,
        ndt_org_role    = @role,
        email           = @email,
        is_active       = @active,
        updated_at      = GETUTCDATE()
      WHERE personnel_id = @id
    `, [
      { name: 'id',       type: sql.Int,           value: id },
      { name: 'name',     type: sql.NVarChar(100), value: full_name },
      { name: 'desig',    type: sql.NVarChar(20),  value: designation },
      { name: 'emp_type', type: sql.NVarChar(12),  value: employment_type },
      { name: 'dj',       type: sql.Date,          value: new Date(date_joined) },
      { name: 'dl',       type: sql.Date,          value: date_left ? new Date(date_left) : null },
      { name: 'role',     type: sql.NVarChar(100), value: ndt_org_role || null },
      { name: 'email',    type: sql.NVarChar(100), value: email || null },
      { name: 'active',   type: sql.Bit,           value: is_active === false ? 0 : 1 },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'Personnel',
      recordId: String(id), moduleId: 'MOD-04', newValue: req.body });
    res.json({ message: 'Personnel updated.' });
  } catch (err) {
    console.error('[personnel/update]', err.message);
    res.status(500).json({ message: 'Error updating personnel.' });
  }
});

/* ---- POST /:id/eye-exams ---- */
router.post('/:id/eye-exams', requireMinRole('SUPERVISOR'), async (req, res) => {
  const personnelId = parseInt(req.params.id, 10);
  const { exam_date, near_vision, colour_vision, result, examiner, exam_location, notes } = req.body;
  if (!exam_date || !result) return res.status(400).json({ message: 'exam_date and result required.' });

  const examDateObj = new Date(exam_date);
  const expiryDate  = new Date(examDateObj);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);  // NAS410 §9.3: annual renewal

  try {
    const r = await query(`
      INSERT INTO dbo.EyeExam
        (personnel_id, exam_date, expiry_date, near_vision, colour_vision,
         result, examiner, exam_location, notes, created_by)
      OUTPUT INSERTED.exam_id
      VALUES (@pid, @ed, @exp, @near, @colour, @result, @examiner, @loc, @notes, @creator)
    `, [
      { name: 'pid',      type: sql.Int,           value: personnelId },
      { name: 'ed',       type: sql.Date,          value: examDateObj },
      { name: 'exp',      type: sql.Date,          value: expiryDate },
      { name: 'near',     type: sql.NVarChar(5),   value: near_vision || 'J1' },
      { name: 'colour',   type: sql.NVarChar(5),   value: colour_vision || 'PASS' },
      { name: 'result',   type: sql.NVarChar(5),   value: result },
      { name: 'examiner', type: sql.NVarChar(100), value: examiner || null },
      { name: 'loc',      type: sql.NVarChar(100), value: exam_location || null },
      { name: 'notes',    type: sql.NVarChar(500), value: notes || null },
      { name: 'creator',  type: sql.Int,           value: req.user.userId },
    ]);
    res.status(201).json({ exam_id: r[0].exam_id, expiry_date: expiryDate.toISOString().split('T')[0], message: 'Eye exam recorded.' });
  } catch (err) {
    console.error('[personnel/eye-exam]', err.message);
    res.status(500).json({ message: 'Error recording eye exam.' });
  }
});

/* ---- GET /:id/eye-exams ---- */
router.get('/:id/eye-exams', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT * FROM dbo.EyeExam WHERE personnel_id = @id AND is_active = 1 ORDER BY exam_date DESC
    `, [{ name: 'id', type: sql.Int, value: id }]);
    res.json({ items: rows });
  } catch (err) {
    console.error('[personnel/eye-exams/list]', err.message);
    res.status(500).json({ message: 'Error fetching eye exams.' });
  }
});

/* ---- POST /:id/training ---- */
router.post('/:id/training', requireMinRole('SUPERVISOR'), async (req, res) => {
  const personnelId = parseInt(req.params.id, 10);
  const { method, training_type, training_date, hours, course_title,
          instructor, training_org, cert_reference, notes } = req.body;

  if (!method || !training_type || !training_date || !hours) {
    return res.status(400).json({ message: 'method, training_type, training_date, hours required.' });
  }

  try {
    const r = await query(`
      INSERT INTO dbo.TrainingRecord
        (personnel_id, method, training_type, training_date, hours,
         course_title, instructor, training_org, cert_reference, notes, recorded_by)
      OUTPUT INSERTED.training_id
      VALUES (@pid, @method, @type, @date, @hours, @title, @inst, @org, @certref, @notes, @recorder)
    `, [
      { name: 'pid',     type: sql.Int,           value: personnelId },
      { name: 'method',  type: sql.NVarChar(5),   value: method },
      { name: 'type',    type: sql.NVarChar(12),  value: training_type },
      { name: 'date',    type: sql.Date,          value: new Date(training_date) },
      { name: 'hours',   type: sql.Decimal(5,1),  value: parseFloat(hours) },
      { name: 'title',   type: sql.NVarChar(200), value: course_title || null },
      { name: 'inst',    type: sql.NVarChar(100), value: instructor || null },
      { name: 'org',     type: sql.NVarChar(100), value: training_org || null },
      { name: 'certref', type: sql.NVarChar(50),  value: cert_reference || null },
      { name: 'notes',   type: sql.NVarChar(500), value: notes || null },
      { name: 'recorder',type: sql.Int,           value: req.user.userId },
    ]);
    res.status(201).json({ training_id: r[0].training_id, message: 'Training record added.' });
  } catch (err) {
    console.error('[personnel/training]', err.message);
    res.status(500).json({ message: 'Error adding training record.' });
  }
});

/* ---- GET /:id/training ---- */
router.get('/:id/training', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT * FROM dbo.TrainingRecord WHERE personnel_id = @id ORDER BY training_date DESC
    `, [{ name: 'id', type: sql.Int, value: id }]);
    res.json({ items: rows });
  } catch (err) {
    console.error('[personnel/training/list]', err.message);
    res.status(500).json({ message: 'Error fetching training records.' });
  }
});

module.exports = router;
