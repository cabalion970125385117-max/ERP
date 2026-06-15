'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

router.get('/alerts/summary', async (req, res) => {
  try {
    const r = await query(`
      SELECT
        (SELECT COUNT(*) FROM Announcement WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > GETUTCDATE())) AS active_announcements,
        (SELECT COUNT(*) FROM Announcement a WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > GETUTCDATE())
          AND NOT EXISTS (SELECT 1 FROM AnnouncementAck k WHERE k.announcement_id = a.announcement_id AND k.user_id = @uid)) AS unacknowledged,
        (SELECT COUNT(*) FROM Announcement WHERE priority = 'URGENT' AND is_active = 1 AND (expires_at IS NULL OR expires_at > GETUTCDATE())) AS urgent_count,
        (SELECT COUNT(*) FROM Announcement WHERE expires_at >= DATEADD(day,-7,GETUTCDATE()) AND expires_at < GETUTCDATE() AND is_active = 1) AS expired_this_week
    `, [{ name: 'uid', type: sql.Int, value: req.user.userId }]);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/announcements', async (req, res) => {
  try {
    const r = await query(`
      SELECT a.*, u.full_name AS published_by_name,
        CASE WHEN EXISTS (SELECT 1 FROM AnnouncementAck k WHERE k.announcement_id = a.announcement_id AND k.user_id = @uid) THEN 1 ELSE 0 END AS acknowledged
      FROM Announcement a JOIN Users u ON u.user_id = a.published_by
      WHERE a.is_active = 1 ORDER BY a.priority DESC, a.published_at DESC
    `, [{ name: 'uid', type: sql.Int, value: req.user.userId }]);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/announcements', requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const { title, body, priority, target_roles, expires_at } = req.body;
    const r = await query(`
      INSERT INTO Announcement (title, body, priority, target_roles, published_by, expires_at)
      OUTPUT INSERTED.announcement_id
      VALUES (@title, @body, @priority, @roles, @uid, @exp)
    `, [
      { name: 'title', type: sql.NVarChar, value: title },
      { name: 'body', type: sql.NVarChar, value: body },
      { name: 'priority', type: sql.NVarChar, value: priority || 'NORMAL' },
      { name: 'roles', type: sql.NVarChar, value: target_roles || null },
      { name: 'uid', type: sql.Int, value: req.user.userId },
      { name: 'exp', type: sql.DateTime2, value: expires_at || null },
    ]);
    const id = r.recordset[0].announcement_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'PUBLISH', tableName: 'Announcement', recordId: id, moduleId: 'MOD-21', newValue: JSON.stringify({ title, priority }) });
    res.status(201).json({ announcement_id: id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/announcements/:id/acknowledge', async (req, res) => {
  try {
    await query(`
      IF NOT EXISTS (SELECT 1 FROM AnnouncementAck WHERE announcement_id = @aid AND user_id = @uid)
        INSERT INTO AnnouncementAck (announcement_id, user_id) VALUES (@aid, @uid)
    `, [
      { name: 'aid', type: sql.Int, value: +req.params.id },
      { name: 'uid', type: sql.Int, value: req.user.userId },
    ]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
