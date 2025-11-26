const prisma = require('../db/prisma');

// Get all complaints (for officers)
exports.getAllComplaints = async (req, res) => {
    try {
        const complaints = await prisma.complaint.findMany({
            include: {
                assignedOfficer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });

        // Also get citizen info for each complaint
        const complaintsWithCitizen = await Promise.all(
            complaints.map(async (complaint) => {
                const citizen = await prisma.user.findUnique({
                    where: { id: complaint.user_id },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                });

                return {
                    id: complaint.id,
                    title: complaint.title,
                    description: complaint.description,
                    category: complaint.category,
                    status: complaint.status,
                    assigned_officer_id: complaint.assigned_officer_id,
                    created_at: complaint.created_at,
                    citizen: citizen || null,
                    assignedOfficer: complaint.assignedOfficer,
                };
            })
        );

        return res.status(200).json(complaintsWithCitizen);
    } catch (error) {
        console.error('Error fetching complaints:', error);
        return res.status(500).json({ error: 'Failed to retrieve complaints' });
    }
};

// Update complaint status
exports.updateComplaintStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const allowedStatuses = ['NEW', 'IN_PROGRESS', 'RESOLVED'];
    if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
            error: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`,
        });
    }

    try {
        // Check if complaint exists
        const complaint = await prisma.complaint.findUnique({
            where: { id },
        });

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Update status
        const updatedComplaint = await prisma.complaint.update({
            where: { id },
            data: { status },
            include: {
                assignedOfficer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // Get citizen info
        const citizen = await prisma.user.findUnique({
            where: { id: updatedComplaint.user_id },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        return res.status(200).json({
            id: updatedComplaint.id,
            title: updatedComplaint.title,
            description: updatedComplaint.description,
            category: updatedComplaint.category,
            status: updatedComplaint.status,
            assigned_officer_id: updatedComplaint.assigned_officer_id,
            created_at: updatedComplaint.created_at,
            citizen: citizen || null,
            assignedOfficer: updatedComplaint.assignedOfficer,
        });
    } catch (error) {
        console.error('Error updating complaint status:', error);
        return res.status(500).json({ error: 'Failed to update complaint status' });
    }
};

// Assign complaint to current officer
exports.assignComplaint = async (req, res) => {
    const { id } = req.params;
    const officerId = req.user.id; // Current logged-in officer

    try {
        // Check if complaint exists
        const complaint = await prisma.complaint.findUnique({
            where: { id },
        });

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Update assigned officer
        const updatedComplaint = await prisma.complaint.update({
            where: { id },
            data: { assigned_officer_id: officerId },
            include: {
                assignedOfficer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // Get citizen info
        const citizen = await prisma.user.findUnique({
            where: { id: updatedComplaint.user_id },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        return res.status(200).json({
            id: updatedComplaint.id,
            title: updatedComplaint.title,
            description: updatedComplaint.description,
            category: updatedComplaint.category,
            status: updatedComplaint.status,
            assigned_officer_id: updatedComplaint.assigned_officer_id,
            created_at: updatedComplaint.created_at,
            citizen: citizen || null,
            assignedOfficer: updatedComplaint.assignedOfficer,
        });
    } catch (error) {
        console.error('Error assigning complaint:', error);
        return res.status(500).json({ error: 'Failed to assign complaint' });
    }
};

