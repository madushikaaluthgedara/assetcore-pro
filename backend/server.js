const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const assetRoutes = require('./routes/assetRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

app.use(cors());
// Service-report PDFs are uploaded as base64 strings inside JSON, so the
// default 100kb JSON limit is far too small — raise it.
app.use(express.json({ limit: '25mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/audit', auditRoutes);

app.get('/', (req, res) => {
    res.send('Asset Management System API is Running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
