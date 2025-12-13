const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Frontend path
const frontendPath = path.join(__dirname, 'frontend');
console.log('Frontend path:', frontendPath);

// Serve static files
app.use(express.static(frontendPath));

// API Routes
const statisticsRoutes = require('./routes/statistics');
const searchRoutes = require('./routes/search');
const vehiclesRoutes = require('./routes/vehicles.routes');
const equipmentRoutes = require('./routes/equipment.routes');
const housingRoutes = require('./routes/housing.routes');
const budgetRoutes = require('./routes/budget.routes');
const buildingRoutes = require('./routes/building.routes');
const weaponsRoutes = require('./routes/weapons.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const secondmentRoutes = require('./routes/secondment.routes');

app.use('/api/statistics', statisticsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/housing', housingRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/building', buildingRoutes);
app.use('/api/weapons', weaponsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/secondment', secondmentRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server running', 
        frontendPath,
        routes: ['/api/statistics', '/api/search', '/api/vehicles', '/api/equipment', '/api/housing']
    });
});

// HTML routes
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'summary.html'));
});

app.get('/summary.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'summary.html'));
});

app.get('/organization.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'organization.html'));
});

app.get('/search.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'search.html'));
});

app.get('/map.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'map.html'));
});

app.get('/department.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'department.html'));
});

app.get('/vehicles.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'vehicles.html'));
});

app.get('/vehicles-search.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'vehicles-search.html'));
});

app.get('/equipment.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'equipment.html'));
});

app.get('/equipment-search.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'equipment-search.html'));
});

app.get('/housing.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'housing.html'));
});

app.get('/budget.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'budget.html'));
});

app.get('/building.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'building.html'));
});

app.get('/weapons.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'weapons.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'login.html'));
});

app.get('/super-admin.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'super-admin.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'register.html'));
});

app.get('/weapons-search.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'weapons-search.html'));
});

app.get('/building-search.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'building-search.html'));
});

app.get('/budget-search.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'budget-search.html'));
});

app.get('/housing-search.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'housing-search.html'));
});

// 404
app.use((req, res) => {
    console.log('404:', req.path);
    res.status(404).json({ success: false, message: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
    console.log('🚀 Server running on port ' + PORT);
    console.log('📂 Frontend: ' + frontendPath);
    console.log('📦 Routes: /api/statistics, /api/search, /api/vehicles, /api/equipment, /api/housing');
});

module.exports = app;
