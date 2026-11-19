const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

// Machine (device) columns the frontend may write.
const DEVICE_COLUMNS = [
    'name', 'parentCategory', 'serialNumber', 'machineCode',
    'department', 'location', 'installDate', 'status', 'createdAt'
];

// Get all machines
router.get('/', async (req, res) => {
    try {
        const [devices] = await db.query('SELECT * FROM devices ORDER BY id ASC');
        res.json(devices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Register a new machine (Protected)
router.post('/', verifyToken, async (req, res) => {
    const b = req.body;
    if (!b.name || !b.parentCategory) {
        return res.status(400).json({ message: 'name and parentCategory are required' });
    }
    try {
        const [result] = await db.query(
            `INSERT INTO devices
             (name, parentCategory, serialNumber, machineCode, department, location, installDate, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [b.name, b.parentCategory, b.serialNumber || '', b.machineCode || '',
             b.department || '', b.location || '', b.installDate || null,
             b.status || 'Running',
             b.createdAt || new Date().toISOString().split('T')[0]]
        );
        res.status(201).json({ message: 'Machine registered successfully!', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a machine — any subset of fields (Protected)
router.put('/:id', verifyToken, async (req, res) => {
    const fields = [];
    const values = [];
    for (const col of DEVICE_COLUMNS) {
        if (req.body[col] !== undefined) {
            fields.push(`${col} = ?`);
            values.push(req.body[col] === '' && col === 'installDate' ? null : req.body[col]);
        }
    }
    if (fields.length === 0) return res.status(400).json({ message: 'Nothing to update' });
    try {
        await db.query(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`, [...values, req.params.id]);
        res.json({ message: 'Machine updated successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a machine (Protected)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM devices WHERE id = ?', [req.params.id]);
        res.json({ message: 'Machine deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
