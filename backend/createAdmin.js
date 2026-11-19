const bcrypt = require('bcrypt');
const db = require('./db');

// Optional helper: database.sql already seeds the admin user, so you only
// need this script if you deleted the admin and want to create it again.
// Run:  node createAdmin.js
async function createAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await db.query(
            'INSERT INTO users (name, username, email, password, role, category, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['System Admin', 'admin', 'admin@gmail.com', hashedPassword, 'Admin', '', new Date().toISOString().split('T')[0]]
        );
        console.log('✅ Admin User Created Successfully! (admin@gmail.com / admin123)');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating admin:', err.message);
        process.exit(1);
    }
}

createAdmin();
