const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

// Get all main categories
router.get('/', async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories ORDER BY id ASC');
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a category (Protected)
router.post('/', verifyToken, async (req, res) => {
    const { name } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: 'Category name is required' });
    try {
        const [result] = await db.query('INSERT INTO categories (name) VALUES (?)', [String(name).trim()]);
        res.status(201).json({ message: 'Category added successfully!', id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'This category already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Delete a category (Protected)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Category deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
