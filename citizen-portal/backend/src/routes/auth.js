const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Register route
router.post('/register', register);

// Login route
router.post('/login', login);

// Get current user route
router.get('/me', authMiddleware, getMe);

module.exports = router;