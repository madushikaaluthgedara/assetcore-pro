const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

// Asset "service task" columns used by the frontend (AdminView / TechnicianView).
// scheduledTime is kept out of the generic UPDATE list handling below only
// because it is a plain string column like the others — it is included.
const ASSET_COLUMNS = [
    'name', 'category', 'serialNumber', 'issue', 'assignedTechnician',
    'scheduledDate', 'scheduledTime', 'status', 'serviceReportPdf',
    'serviceCost', 'registeredDate', 'completedAt',
    'maintenanceType', 'downtimeStart', 'downtimeEnd', 'spareParts'
];

// Keep the linked machine's live status in step with its work orders:
//   any open Breakdown job  -> 'Breakdown'
//   else any open job       -> 'Under Maintenance'
//   else                    -> 'Running'
// Machines are linked to work orders by serial number.
async function recomputeMachineStatus(serialNumber) {
    if (!serialNumber) return;
    try {
        const [[row]] = await db.query(
            `SELECT
               COALESCE(SUM(CASE WHEN maintenanceType = 'Breakdown' AND status <> 'Completed' THEN 1 ELSE 0 END), 0) AS openBreakdowns,
               COALESCE(SUM(CASE WHEN status <> 'Completed' THEN 1 ELSE 0 END), 0) AS openJobs
             FROM assets WHERE serialNumber = ?`,
            [serialNumber]
        );
        const status = Number(row.openBreakdowns) > 0 ? 'Breakdown'
            : Number(row.openJobs) > 0 ? 'Under Maintenance' : 'Running';
        await db.query('UPDATE devices SET status = ? WHERE serialNumber = ?', [status, serialNumber]);
    } catch (err) {
        console.error('Machine status update failed:', err.message);
    }
}

// Accept the older backend field names as aliases for the frontend names.
function mapAliases(body) {
    const b = { ...body };
    if (b.serialNumber === undefined && b.serial_number !== undefined) b.serialNumber = b.serial_number;
    if (b.assignedTechnician === undefined && b.technician !== undefined) b.assignedTechnician = b.technician;
    if (b.scheduledDate === undefined && b.schedule !== undefined) b.scheduledDate = b.schedule;
    return b;
}

// 1. Get All Assets
router.get('/', async (req, res) => {
    try {
        const [assets] = await db.query('SELECT * FROM assets ORDER BY id ASC');
        res.json(assets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Add a new Asset / Task (Protected)
router.post('/', verifyToken, async (req, res) => {
    const b = mapAliases(req.body);
    try {
        const [result] = await db.query(
            `INSERT INTO assets
             (name, category, serialNumber, issue, assignedTechnician, scheduledDate, scheduledTime, status, serviceReportPdf, serviceCost, registeredDate, maintenanceType, downtimeStart, downtimeEnd, spareParts)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [b.name, b.category || 'General', b.serialNumber || '', b.issue || '',
             b.assignedTechnician || '', b.scheduledDate || null, b.scheduledTime || '',
             b.status || 'Assigned', b.serviceReportPdf || '', b.serviceCost || '',
             b.registeredDate || new Date().toISOString().split('T')[0],
             b.maintenanceType || 'Preventive', b.downtimeStart || null,
             b.downtimeEnd || null, b.spareParts || '']
        );
        await recomputeMachineStatus(b.serialNumber);
        res.status(201).json({ message: 'Work order added successfully!', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Update an Asset / Task — any subset of fields.
//    Admin sends { status }; Technician sends { status, serviceReportPdf, serviceCost, completedAt }.
router.put('/:id', async (req, res) => {
    const b = mapAliases(req.body);
    const fields = [];
    const values = [];
    const NULLABLE_DATES = ['scheduledDate', 'downtimeStart', 'downtimeEnd'];
    for (const col of ASSET_COLUMNS) {
        if (b[col] !== undefined) {
            fields.push(`${col} = ?`);
            values.push(b[col] === '' && NULLABLE_DATES.includes(col) ? null : b[col]);
        }
    }
    if (fields.length === 0) return res.status(400).json({ message: 'Nothing to update' });
    try {
        const [[old]] = await db.query('SELECT serialNumber FROM assets WHERE id = ?', [req.params.id]);
        await db.query(`UPDATE assets SET ${fields.join(', ')} WHERE id = ?`, [...values, req.params.id]);
        if (old) await recomputeMachineStatus(old.serialNumber);
        if (b.serialNumber && (!old || b.serialNumber !== old.serialNumber)) {
            await recomputeMachineStatus(b.serialNumber);
        }
        res.json({ message: 'Work order updated successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Delete Asset (Protected)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const [[old]] = await db.query('SELECT serialNumber FROM assets WHERE id = ?', [req.params.id]);
        await db.query('DELETE FROM assets WHERE id = ?', [req.params.id]);
        if (old) await recomputeMachineStatus(old.serialNumber);
        res.json({ message: 'Work order deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
