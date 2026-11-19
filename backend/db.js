const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'asset_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Return DATE / TIME columns as plain strings ('2026-01-31') so the
    // frontend's scheduledDate string comparisons keep working.
    dateStrings: true
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database Connection Failed:', err.message);
        console.error('   Check backend/.env (DB_HOST, DB_USER, DB_PASS, DB_NAME) and that MySQL is running.');
    } else {
        console.log('✅ Connected to MySQL Database (asset_db)!');
        connection.release();
    }
});

module.exports = pool.promise();
