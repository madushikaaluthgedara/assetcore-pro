const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Roles in the frontend are capitalised ('Admin', 'Technician', 'User') and
// App.jsx compares them exactly, so normalise every role to that form.
function normalizeRole(role) {
    if (!role) return 'User';
    const r = String(role).trim().toLowerCase();
    if (r === 'admin') return 'Admin';
    if (r === 'technician') return 'Technician';
    return 'User';
}

// User object that is safe to send to the frontend (no password hash).
function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        username: user.username || '',
        email: user.email,
        role: normalizeRole(user.role),
        category: user.category || '',
        createdAt: user.createdAt || ''
    };
}

// 1. User Register (Password Hashing Security)
router.post('/register', async (req, res) => {
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
             new Date().toISOString().split('T')[0]]
        );
        res.status(201).json({ message: 'User registered successfully!', id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'A user with this email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// 2. User Login (JWT Authentication Security)
//    The old Firebase login matched the typed value against email OR name OR
//    username (case-insensitive), so the backend does the same.
router.post('/login', async (req, res) => {
    const identifier = (req.body.email || req.body.identifier || req.body.name || '').trim();
    const password = req.body.password || '';
    if (!identifier || !password) {
        return res.status(400).json({ message: 'Email/username and password are required' });
    }
    try {
        const [users] = await db.query(
            `SELECT * FROM users
             WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?) OR LOWER(username) = LOWER(?)
             LIMIT 1`,
            [identifier, identifier, identifier]
        );
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, role: normalizeRole(user.role) },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ token, user: publicUser(user) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Technicians only — defined BEFORE module.exports (it was after it before; it
//    worked only because Express keeps a reference to the same router object).
router.get('/technicians', async (req, res) => {
    try {
        const [technicians] = await db.query(
            "SELECT id, name, username, email, role, category, createdAt FROM users WHERE LOWER(role) = 'technician'"
        );
        res.json(technicians.map(publicUser));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
module.exports.normalizeRole = normalizeRole;
module.exports.publicUser = publicUser;
