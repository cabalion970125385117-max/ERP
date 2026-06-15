'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.get('/journal-entries', async (req, res) => {
  try {
    const { status } = req.query;
    let where = 'WHERE je.is_active = 1';
    const params = [];
    if (status) { where += ' AND je.status = @status'; params.push({ name: 'status', type: sql.NVarChar, value: status }); }
    const r = await query(`SELECT je.*, u.full_name AS created_by_name FROM JournalEntry je LEFT JOIN Users u ON u.user_id = je.created_by ${where} ORDER BY je.entry_date DESC`, params);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/journal-entries', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { entry_date, description, reference, lines } = req.body;
    if (!entry_date || !description) return res.status(400).json({ message: 'entry_date and description are required.' });

    // GAP-01: JE balance check — total debit must equal total credit (AS9100D §7.1.1 / SoR §11)
    const lineArr = lines || [];
    if (lineArr.length < 2) return res.status(400).json({ message: 'Journal entry requires at least 2 lines.' });
    const { debit: totalDebit, credit: totalCredit } = lineArr.reduce(
      (acc, l) => ({ debit: acc.debit + (parseFloat(l.debit) || 0), credit: acc.credit + (parseFloat(l.credit) || 0) }),
      { debit: 0, credit: 0 }
    );
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      return res.status(400).json({ message: `Journal entry does not balance — debit ${totalDebit.toFixed(2)} ≠ credit ${totalCredit.toFixed(2)}.` });
    }

    const yr = new Date().getFullYear();
    const seqR = await query('UPDATE Mod16Sequence SET last_num = CASE WHEN year = @yr THEN last_num + 1 ELSE 1 END, year = @yr OUTPUT INSERTED.last_num', [{ name: 'yr', type: sql.Int, value: yr }]);
    const num = `JE-${yr}-${String(seqR.recordset[0].last_num).padStart(4, '0')}`;
    const r = await query(`
      INSERT INTO JournalEntry (entry_number, entry_date, description, reference, created_by)
      OUTPUT INSERTED.entry_id
      VALUES (@num, @ed, @desc, @ref, @uid)
    `, [
      { name: 'num', type: sql.NVarChar, value: num },
      { name: 'ed', type: sql.Date, value: entry_date },
      { name: 'desc', type: sql.NVarChar, value: description },
      { name: 'ref', type: sql.NVarChar, value: reference || null },
      { name: 'uid', type: sql.Int, value: req.user.userId },
    ]);
    const entry_id = r.recordset[0].entry_id;
    for (const l of (lines || [])) {
      await query('INSERT INTO JournalLine (entry_id, account_id, debit, credit, description) VALUES (@eid, @aid, @dr, @cr, @desc)', [
        { name: 'eid', type: sql.Int, value: entry_id },
        { name: 'aid', type: sql.Int, value: l.account_id },
        { name: 'dr', type: sql.Decimal, value: l.debit || 0 },
        { name: 'cr', type: sql.Decimal, value: l.credit || 0 },
        { name: 'desc', type: sql.NVarChar, value: l.description || null },
      ]);
    }
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'JournalEntry', recordId: entry_id, moduleId: 'MOD-16', newValue: JSON.stringify({ num, description }) });
    res.status(201).json({ entry_id, entry_number: num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/journal-entries/:id/post', requireMinRole('QA_MANAGER'), async (req, res) => {
  try {
    await query(`UPDATE JournalEntry SET status = 'POSTED', posted_by = @uid, posted_at = GETUTCDATE() WHERE entry_id = @id AND status = 'DRAFT' AND is_active = 1`, [
      { name: 'uid', type: sql.Int, value: req.user.userId },
      { name: 'id', type: sql.Int, value: +req.params.id },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'POST', tableName: 'JournalEntry', recordId: +req.params.id, moduleId: 'MOD-16', newValue: 'POSTED' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
