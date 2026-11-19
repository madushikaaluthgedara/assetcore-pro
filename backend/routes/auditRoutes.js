const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

// 1. Get All Audit Logs (with user details)
router.get('/', verifyToken, async (req, res) => {
    try {
        const [logs] = await db.query(`
            SELECT a.*, u.name AS user_name, u.email AS user_email
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.timestamp DESC
        `);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Create a Log — user id comes from the JWT token
router.post('/', verifyToken, async (req, res) => {
    const { action } = req.body;
    const user_id = req.user.id;

    try {
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
            [user_id, action]
        );
        res.status(201).json({ message: 'Audit log recorded successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
