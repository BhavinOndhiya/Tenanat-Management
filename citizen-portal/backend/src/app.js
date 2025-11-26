const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const officerRoutes = require('./routes/officer');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/officer', officerRoutes);

// Error handling middleware (if exists)
try {
    const { errorHandler } = require('./middleware/errorHandler');
    app.use(errorHandler);
} catch (e) {
    // Error handler not found, use basic error handling
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ error: 'Something went wrong!' });
    });
}

module.exports = app;