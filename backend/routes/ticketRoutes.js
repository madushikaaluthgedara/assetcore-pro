const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

const TICKET_COLUMNS = [
    'category', 'assetName', 'serialNumber', 'issue', 'reportedBy',
    'reportedByEmail', 'status', 'createdAt', 'assignedTechnician',
    'scheduledDate', 'scheduledTime', 'priority', 'asset_id', 'reported_by_id'
];

function mapAliases(body, req) {
    const b = { ...body };
    // Older backend clients sent { asset_id, description, priority }.
    if (b.issue === undefined && b.description !== undefined) b.issue = b.description;
    if (b.asset_id === undefined && b.assetId !== undefined) b.asset_id = b.assetId;
    if (b.reported_by_id === undefined && req.user && req.user.id) b.reported_by_id = req.user.id;
    return b;
}

// 1. Submit a new Ticket / Issue (Protected — the signed-in user's token is used,
//    but reportedBy / reportedByEmail come from the body, as the UI sends names.)
router.post('/', verifyToken, async (req, res) => {
    const b = mapAliases(req.body, req);
    try {
        const [result] = await db.query(
            `INSERT INTO tickets
             (category, assetName, serialNumber, issue, reportedBy, reportedByEmail, status, createdAt,
              assignedTechnician, scheduledDate, scheduledTime, priority, asset_id, reported_by_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [b.category || 'General', b.assetName || b.name || '', b.serialNumber || 'N/A',
             b.issue || '', b.reportedBy || '', b.reportedByEmail || '',
             b.status || 'Pending',
             b.createdAt || new Date().toISOString().split('T')[0],
             b.assignedTechnician || '', b.scheduledDate || null, b.scheduledTime || '',
             b.priority || '', b.asset_id || null, b.reported_by_id || null]
        );
        res.status(201).json({ message: 'Ticket created successfully!', id: result.insertId, ticketId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Get All Tickets
router.get('/', verifyToken, async (req, res) => {
    try {
        const [tickets] = await db.query('SELECT * FROM tickets ORDER BY id ASC');
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Update a Ticket — any subset of fields.
//    Admin assignment sends { status:'Assigned', assignedTechnician, scheduledDate, scheduledTime }.
router.put('/:id', verifyToken, async (req, res) => {
    const b = mapAliases(req.body, req);
    const fields = [];
    const values = [];
    for (const col of TICKET_COLUMNS) {
        if (b[col] !== undefined) {
            fields.push(`${col} = ?`);
            values.push(b[col] === '' && col === 'scheduledDate' ? null : b[col]);
        }
    }
    if (fields.length === 0) return res.status(400).json({ message: 'Nothing to update' });
    try {
        await db.query(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`, [...values, req.params.id]);
        res.json({ message: 'Ticket updated successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Delete a Ticket (Protected)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM tickets WHERE id = ?', [req.params.id]);
        res.json({ message: 'Ticket deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
