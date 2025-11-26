import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllComplaints, updateComplaintStatus, assignComplaint } from '../api/api';
import './OfficerDashboard.css';

const OfficerDashboard = () => {
    const { user, token } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draggedComplaint, setDraggedComplaint] = useState(null);
    const [error, setError] = useState('');

    const statusColumns = {
        NEW: 'New',
        IN_PROGRESS: 'In Progress',
        RESOLVED: 'Resolved',
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const data = await getAllComplaints();
            setComplaints(data);
        } catch (err) {
            setError('Failed to load complaints');
            console.error('Error fetching complaints:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e, complaint) => {
        setDraggedComplaint(complaint);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, targetStatus) => {
        e.preventDefault();
        if (!draggedComplaint) return;

        // Don't update if status hasn't changed
        if (draggedComplaint.status === targetStatus) {
            setDraggedComplaint(null);
            return;
        }

        const originalStatus = draggedComplaint.status;

        // Optimistic update
        const updatedComplaints = complaints.map((c) =>
            c.id === draggedComplaint.id ? { ...c, status: targetStatus } : c
        );
        setComplaints(updatedComplaints);
        setDraggedComplaint(null);

        try {
            await updateComplaintStatus(draggedComplaint.id, targetStatus);
            // Refresh to get latest data
            await fetchComplaints();
        } catch (err) {
            // Revert on error
            const revertedComplaints = complaints.map((c) =>
                c.id === draggedComplaint.id ? { ...c, status: originalStatus } : c
            );
            setComplaints(revertedComplaints);
            setError('Failed to update complaint status');
            console.error('Error updating status:', err);
        }
    };

    const handleAssign = async (complaintId) => {
        try {
            await assignComplaint(complaintId);
            await fetchComplaints(); // Refresh to get updated assignment
        } catch (err) {
            setError('Failed to assign complaint');
            console.error('Error assigning complaint:', err);
        }
    };

    const getComplaintsByStatus = (status) => {
        return complaints.filter((c) => c.status === status);
    };

    const isAssignedToMe = (complaint) => {
        return complaint.assigned_officer_id === user?.id;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <p>Loading complaints...</p>
            </div>
        );
    }

    return (
        <div className="officer-dashboard">
            <h1>Officer Dashboard</h1>
            <p>Welcome, {user?.name}</p>
            {error && <div className="error-message">{error}</div>}

            <div className="kanban-board">
                {Object.entries(statusColumns).map(([statusKey, statusLabel]) => (
                    <div
                        key={statusKey}
                        className="kanban-column"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, statusKey)}
                    >
                        <h2 className="column-header">{statusLabel}</h2>
                        <div className="column-content">
                            {getComplaintsByStatus(statusKey).map((complaint) => (
                                <div
                                    key={complaint.id}
                                    className="complaint-card"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, complaint)}
                                >
                                    <h3>{complaint.title}</h3>
                                    <p className="complaint-category">{complaint.category}</p>
                                    <p className="complaint-description">{complaint.description}</p>
                                    <div className="complaint-meta">
                                        <p className="complaint-date">
                                            Created: {formatDate(complaint.created_at)}
                                        </p>
                                        <p className="complaint-citizen">
                                            Citizen: {complaint.citizen?.name || complaint.citizen?.email || 'Unknown'}
                                        </p>
                                        {complaint.assigned_officer_id ? (
                                            <p className="complaint-assigned">
                                                {isAssignedToMe(complaint) ? (
                                                    <span className="assigned-to-me">Assigned to you</span>
                                                ) : (
                                                    <span>Assigned</span>
                                                )}
                                            </p>
                                        ) : (
                                            <button
                                                className="assign-button"
                                                onClick={() => handleAssign(complaint.id)}
                                            >
                                                Assign to me
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {getComplaintsByStatus(statusKey).length === 0 && (
                                <p className="empty-column">No complaints</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OfficerDashboard;

