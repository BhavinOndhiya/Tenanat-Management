const prisma = require('../db/prisma');

// Create a new complaint
const createComplaint = async (req, res) => {
    const { title, description, category } = req.body;
    const userId = req.user.id; // User ID is set in req.user by auth middleware

    if (!title || !description || !category) {
        return res.status(400).json({ error: 'Title, description, and category are required' });
    }

    try {
        const complaint = await prisma.complaint.create({
            data: {
                title,
                description,
                category,
                user_id: userId,
                status: 'NEW',
            },
        });
        return res.status(201).json(complaint);
    } catch (error) {
        console.error('Error creating complaint:', error);
        return res.status(500).json({ error: 'Failed to create complaint' });
    }
};

// Get all complaints for the logged-in user
const getMyComplaints = async (req, res) => {
    const userId = req.user.id; // User ID is set in req.user by auth middleware

    try {
        const complaints = await prisma.complaint.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
        });
        return res.status(200).json(complaints);
    } catch (error) {
        console.error('Error fetching complaints:', error);
        return res.status(500).json({ error: 'Failed to retrieve complaints' });
    }
};

module.exports = {
    createComplaint,
    getMyComplaints,
};