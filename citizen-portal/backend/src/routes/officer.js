const express = require('express');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const {
    getAllComplaints,
    updateComplaintStatus,
    assignComplaint,
} = require('../controllers/officerController');

const router = express.Router();

// All officer routes require authentication and OFFICER role
router.use(authMiddleware);
router.use(requireRole('OFFICER'));

// Get all complaints
router.get('/complaints', getAllComplaints);

// Update complaint status
router.patch('/complaints/:id/status', updateComplaintStatus);

// Assign complaint to current officer
router.patch('/complaints/:id/assign', assignComplaint);

module.exports = router;

