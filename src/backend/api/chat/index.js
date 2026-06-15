'use strict';
/**
 * Chat API — WhatsApp-style internal messaging
 * GET    /api/v1/chat/users              — all active users (for starting DMs)
 * GET    /api/v1/chat/rooms              — rooms I participate in
 * POST   /api/v1/chat/rooms             — create DIRECT or GROUP room
 * GET    /api/v1/chat/rooms/:id/messages — messages (supports ?since=ISO)
 * POST   /api/v1/chat/rooms/:id/messages — send a message
 * DELETE /api/v1/chat/rooms/:id/messages/:mid — soft-delete own message
 */

const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireAuth, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* ── GET /users ── */
router.get('/users', async (req, res) => {
  try {
    const rows = await query(
      `SELECT user_id, full_name, username, role FROM dbo.Users WHERE is_active = 1 ORDER BY full_name`,
      []
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Error fetching users.' }); }
});

/* ── GET /rooms ── */
router.get('/rooms', async (req, res) => {
  try {
    const rows = await query(`
      SELECT r.room_id, r.name, r.room_type, r.created_at,
        (SELECT TOP 1 m.body FROM dbo.ChatMessage m WHERE m.room_id = r.room_id AND m.is_deleted = 0 ORDER BY m.sent_at DESC) AS last_message,
        (SELECT TOP 1 m.sent_at FROM dbo.ChatMessage m WHERE m.room_id = r.room_id AND m.is_deleted = 0 ORDER BY m.sent_at DESC) AS last_sent_at,
        (SELECT COUNT(*) FROM dbo.ChatParticipant cp2 WHERE cp2.room_id = r.room_id) AS participant_count,
        (SELECT STRING_AGG(u2.full_name, ', ') FROM dbo.ChatParticipant cp3
         INNER JOIN dbo.Users u2 ON u2.user_id = cp3.user_id
         WHERE cp3.room_id = r.room_id AND cp3.user_id <> @uid) AS other_names
      FROM dbo.ChatRoom r
      INNER JOIN dbo.ChatParticipant cp ON cp.room_id = r.room_id
      WHERE cp.user_id = @uid AND r.is_active = 1
      ORDER BY last_sent_at DESC
    `, [{ name: 'uid', type: sql.Int, value: req.user.userId }]);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Error fetching rooms.' }); }
});

/* ── POST /rooms ── */
router.post('/rooms', async (req, res) => {
  const { name, room_type = 'DIRECT', participant_ids } = req.body;
  const pids = Array.isArray(participant_ids) ? participant_ids : [];
  if (!pids.length) return res.status(400).json({ message: 'participant_ids required.' });

  const allIds = [...new Set([req.user.userId, ...pids.map(Number)])];

  // For DIRECT rooms, return existing room if already exists
  if (room_type === 'DIRECT' && allIds.length === 2) {
    const other = allIds.find(id => id !== req.user.userId);
    const existing = await query(`
      SELECT r.room_id FROM dbo.ChatRoom r
      WHERE r.room_type = 'DIRECT' AND r.is_active = 1
        AND EXISTS (SELECT 1 FROM dbo.ChatParticipant p1 WHERE p1.room_id = r.room_id AND p1.user_id = @me)
        AND EXISTS (SELECT 1 FROM dbo.ChatParticipant p2 WHERE p2.room_id = r.room_id AND p2.user_id = @other)
        AND (SELECT COUNT(*) FROM dbo.ChatParticipant p3 WHERE p3.room_id = r.room_id) = 2
    `, [
      { name: 'me',    type: sql.Int, value: req.user.userId },
      { name: 'other', type: sql.Int, value: other },
    ]);
    if (existing.length) return res.json({ room_id: existing[0].room_id, existed: true });
  }

  try {
    const r = await query(`
      INSERT INTO dbo.ChatRoom (name, room_type, created_by) OUTPUT INSERTED.room_id
      VALUES (@name, @type, @uid)
    `, [
      { name: 'name', type: sql.NVarChar(100), value: name || null },
      { name: 'type', type: sql.NVarChar(10),  value: room_type },
      { name: 'uid',  type: sql.Int,           value: req.user.userId },
    ]);
    const room_id = r[0].room_id;

    for (const uid of allIds) {
      await query(
        `INSERT INTO dbo.ChatParticipant (room_id, user_id) VALUES (@rid, @uid)`,
        [{ name: 'rid', type: sql.Int, value: room_id }, { name: 'uid', type: sql.Int, value: uid }]
      );
    }
    res.status(201).json({ room_id, existed: false });
  } catch (e) { res.status(500).json({ message: 'Error creating room.' }); }
});

/* ── GET /rooms/:id/messages ── */
router.get('/rooms/:id/messages', async (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const since  = req.query.since || null;
  try {
    // Verify participant
    const access = await query(
      `SELECT 1 FROM dbo.ChatParticipant WHERE room_id = @rid AND user_id = @uid`,
      [{ name: 'rid', type: sql.Int, value: roomId }, { name: 'uid', type: sql.Int, value: req.user.userId }]
    );
    if (!access.length) return res.status(403).json({ message: 'Not a participant of this room.' });

    const params = [{ name: 'rid', type: sql.Int, value: roomId }];
    let sinceClause = '';
    if (since) {
      sinceClause = ' AND m.sent_at > @since';
      params.push({ name: 'since', type: sql.DateTime2, value: new Date(since) });
    }

    const rows = await query(`
      SELECT m.message_id, m.sender_id, u.full_name AS sender_name,
             m.body, m.sent_at, m.is_deleted
      FROM dbo.ChatMessage m
      INNER JOIN dbo.Users u ON u.user_id = m.sender_id
      WHERE m.room_id = @rid${sinceClause}
      ORDER BY m.sent_at ASC
      OFFSET 0 ROWS FETCH NEXT 200 ROWS ONLY
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Error fetching messages.' }); }
});

/* ── POST /rooms/:id/messages ── */
router.post('/rooms/:id/messages', async (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ message: 'Message body required.' });

  try {
    const access = await query(
      `SELECT 1 FROM dbo.ChatParticipant WHERE room_id = @rid AND user_id = @uid`,
      [{ name: 'rid', type: sql.Int, value: roomId }, { name: 'uid', type: sql.Int, value: req.user.userId }]
    );
    if (!access.length) return res.status(403).json({ message: 'Not a participant of this room.' });

    const r = await query(`
      INSERT INTO dbo.ChatMessage (room_id, sender_id, body) OUTPUT INSERTED.message_id, INSERTED.sent_at
      VALUES (@rid, @uid, @body)
    `, [
      { name: 'rid',  type: sql.Int,            value: roomId },
      { name: 'uid',  type: sql.Int,            value: req.user.userId },
      { name: 'body', type: sql.NVarChar(2000), value: body.trim() },
    ]);
    res.status(201).json({ message_id: r[0].message_id, sent_at: r[0].sent_at });
  } catch (e) { res.status(500).json({ message: 'Error sending message.' }); }
});

/* ── DELETE /rooms/:id/messages/:mid ── */
router.delete('/rooms/:id/messages/:mid', async (req, res) => {
  const mid = parseInt(req.params.mid, 10);
  try {
    await query(
      `UPDATE dbo.ChatMessage SET is_deleted = 1 WHERE message_id = @mid AND sender_id = @uid`,
      [{ name: 'mid', type: sql.Int, value: mid }, { name: 'uid', type: sql.Int, value: req.user.userId }]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: 'Error deleting message.' }); }
});

module.exports = router;
