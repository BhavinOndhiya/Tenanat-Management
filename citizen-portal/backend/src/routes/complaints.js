const express = require('express');
const { createComplaint, getMyComplaints } = require('../controllers/complaintController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Create a new complaint
router.post('/', authMiddleware, createComplaint);

// Get complaints for the logged-in user
router.get('/my', authMiddleware, getMyComplaints);

module.exports = router;