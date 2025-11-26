import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/api';

const Dashboard = () => {
    const { user, token } = useContext(AuthContext);
    const [complaints, setComplaints] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Road',
    });

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const response = await api.get('/complaints/my', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setComplaints(response.data);
        } catch (error) {
            console.error('Error fetching complaints:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/complaints', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setFormData({ title: '', description: '', category: 'Road' });
            fetchComplaints();
        } catch (error) {
            console.error('Error creating complaint:', error);
        }
    };

    return (
        <div>
            <h1>Welcome, {user.name}!</h1>
            <form onSubmit={handleSubmit}>
                <h2>Create Complaint</h2>
                <input
                    type="text"
                    name="title"
                    placeholder="Title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                />
                <textarea
                    name="description"
                    placeholder="Description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                />
                <select name="category" value={formData.category} onChange={handleChange}>
                    <option value="Road">Road</option>
                    <option value="Water">Water</option>
                    <option value="Electricity">Electricity</option>
                </select>
                <button type="submit">Submit Complaint</button>
            </form>
            <h2>My Complaints</h2>
            <ul>
                {complaints.length > 0 ? (
                    complaints.map((complaint) => (
                        <li key={complaint.id}>
                            <h3>{complaint.title}</h3>
                            <p>Category: {complaint.category}</p>
                            <p>Status: {complaint.status}</p>
                            <p>Created At: {new Date(complaint.created_at).toLocaleString()}</p>
                        </li>
                    ))
                ) : (
                    <p>No complaints yet.</p>
                )}
            </ul>
        </div>
    );
};

export default Dashboard;