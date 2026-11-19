-- ============================================================
--  AssetCore Pro — IT Asset & Ticket System
--  MySQL database: asset_db
--  Import this file in phpMyAdmin (Import tab) or with:
--      mysql -u root -p < database.sql
--  It creates the database, all tables, and the admin login:
--      Email:    admin@gmail.com   (you can also type the username: admin)
--      Password: admin123
-- ============================================================

CREATE DATABASE IF NOT EXISTS asset_db;
USE asset_db;

-- 1. Users ---------------------------------------------------
-- role values match the frontend exactly: 'Admin', 'Technician', 'User'
-- category = technician specialisation ('' for other roles)
-- password = bcrypt hash (cost 10), never plain text
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'User',
    category VARCHAR(100) NOT NULL DEFAULT '',
    createdAt DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories ----------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 3. Devices (device models registered by Admin) -------------
CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    parentCategory VARCHAR(100) NOT NULL,
    serialNumber VARCHAR(100) NOT NULL DEFAULT '',
    machineCode VARCHAR(50) NOT NULL DEFAULT '',
    department VARCHAR(100) NOT NULL DEFAULT '',
    location VARCHAR(150) NOT NULL DEFAULT '',
    installDate DATE NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Running',
    createdAt DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Assets (asset service tasks — the main Admin/Technician data) --
-- status values used by the UI: 'Assigned', 'In Progress', 'Completed', 'Maintenance'
-- serviceReportPdf stores the technician's PDF report as a base64 data URL
CREATE TABLE IF NOT EXISTS assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    serialNumber VARCHAR(100) NOT NULL DEFAULT '',
    issue TEXT NULL,
    assignedTechnician VARCHAR(100) NOT NULL DEFAULT '',
    scheduledDate DATE NULL,
    scheduledTime VARCHAR(10) NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'Assigned',
    serviceReportPdf LONGTEXT NULL,
    serviceCost VARCHAR(50) NOT NULL DEFAULT '',
    maintenanceType VARCHAR(30) NOT NULL DEFAULT 'Preventive',
    downtimeStart DATETIME NULL,
    downtimeEnd DATETIME NULL,
    spareParts TEXT NULL,
    registeredDate DATE NULL,
    completedAt DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tickets (issues reported by Users) ----------------------
-- Tickets reference the device by NAME + serial number (as the UI does),
-- so there is no foreign key to assets. asset_id / reported_by_id are
-- kept only for compatibility with older backend calls.
-- status values used by the UI: 'Pending', 'Assigned'
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    assetName VARCHAR(150) NOT NULL DEFAULT '',
    serialNumber VARCHAR(100) NOT NULL DEFAULT '',
    issue TEXT NULL,
    reportedBy VARCHAR(100) NOT NULL DEFAULT '',
    reportedByEmail VARCHAR(150) NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    createdAt DATE NULL,
    assignedTechnician VARCHAR(100) NOT NULL DEFAULT '',
    scheduledDate DATE NULL,
    scheduledTime VARCHAR(10) NOT NULL DEFAULT '',
    priority VARCHAR(20) NOT NULL DEFAULT '',
    asset_id INT NULL,
    reported_by_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Audit Logs ----------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
--  Seed: Admin user  (password below is a bcrypt hash of 'admin123')
-- ============================================================
INSERT INTO users (name, username, email, password, role, category, createdAt)
VALUES ('System Admin', 'admin', 'admin@gmail.com', '$2b$10$5q8ZnoiFaNn6XL3A4dMyw.uGsbFjzEma2Cw6azzU7hw7e5t9NaFGG', 'Admin', '', CURDATE())
ON DUPLICATE KEY UPDATE name = VALUES(name);
