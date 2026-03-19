require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// ── Connect Database ──────────────────────────────────
connectDB();

// ── Middleware ────────────────────────────────────────
// In production, allow requests from your Render URL. 
// Replace 'https://freshscan-in7y.onrender.com' with your actual Render URL if different.
const allowedOrigin = process.env.NODE_ENV === 'production' 
    ? 'https://freshscan-in7y.onrender.com' 
    : 'http://localhost:5173';

app.use(cors({ 
    origin: allowedOrigin, 
    credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/scans',   require('./routes/scans'));
app.use('/api/vendor',  require('./routes/vendor'));

// ── Serve React in production ─────────────────────────
if (process.env.NODE_ENV === 'production') {
    // This points to MajorProject/client/dist
    const buildPath = path.join(__dirname, '..', 'client', 'dist');
    
    // Serve the static files
    app.use(express.static(buildPath));

    // Handle SPA (Single Page Application) routing
    app.get('*', (req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
    });
} else {
    // Simple root for development testing
    app.get('/', (req, res) => {
        res.send('API is running in development mode...');
    });
}

// ── Global error handler ──────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🥦 FreshScan server running on port ${PORT}`));