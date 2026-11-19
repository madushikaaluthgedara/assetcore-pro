const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');
const { normalizeRole, publicUser } = require('./authRoutes');

// List all users (Admin "User Accounts" tab). Passwords are never returned.
router.get('/', verifyToken, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, name, username, email, role, category, createdAt FROM users ORDER BY id ASC'
        );
        res.json(users.map(publicUser));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a user account (Admin). Password is bcrypt-hashed before storing.
router.post('/', verifyToken, async (req, res) => {
    const { name, username, email, password, role, category } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'name, email and password are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const normRole = normalizeRole(role);
        const [result] = await db.query(
            'INSERT INTO users (name, username, email, password, role, category, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, username || null, email, hashedPassword, normRole,
             normRole === 'Technician' ? (category || 'General') : (category || ''),
             req.body.createdAt || new Date().toISOString().split('T')[0]]
        );
        res.status(201).json({ message: 'User account created successfully!', id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'A user with this email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Update a user (any subset of name / username / email / role / category / password)
router.put('/:id', verifyToken, async (req, res) => {
    const allowed = ['name', 'username', 'email', 'role', 'category'];
    const fields = [];
    const values = [];
    for (const key of allowed) {
        if (req.body[key] !== undefined) {
            fields.push(`${key} = ?`);
            values.push(key === 'role' ? normalizeRole(req.body[key]) : req.body[key]);
        }
    }
    if (req.body.password) {
        fields.push('password = ?');
        values.push(await bcrypt.hash(req.body.password, 10));
    }
    if (fields.length === 0) return res.status(400).json({ message: 'Nothing to update' });
    try {
        await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, [...values, req.params.id]);
        res.json({ message: 'User updated successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a user account (Admin). Guard: Admin accounts and your own
// account can never be deleted, so the system always keeps an admin login.
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        if (Number(req.params.id) === Number(req.user.id)) {
            return res.status(400).json({ message: 'You cannot delete your own account.' });
        }
        const [rows] = await db.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
        if (rows.length > 0 && rows[0].role === 'Admin') {
            return res.status(400).json({ message: 'Admin accounts are protected and cannot be deleted.' });
        }
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
