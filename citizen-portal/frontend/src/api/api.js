const API_URL = 'http://localhost:5000/api';

const apiHelper = async (endpoint, method = 'GET', body = null) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Something went wrong');
    }

    return response.json();
};

export const registerUser = async (userData) => {
    return apiHelper('/auth/register', 'POST', userData);
};

export const loginUser = async (credentials) => {
    return apiHelper('/auth/login', 'POST', credentials);
};

export const getCurrentUser = async () => {
    return apiHelper('/me');
};

export const createComplaint = async (complaintData) => {
    return apiHelper('/complaints', 'POST', complaintData);
};

export const getMyComplaints = async () => {
    return apiHelper('/complaints/my');
};

// Officer API functions
export const getAllComplaints = async () => {
    return apiHelper('/officer/complaints');
};

export const updateComplaintStatus = async (complaintId, status) => {
    return apiHelper(`/officer/complaints/${complaintId}/status`, 'PATCH', { status });
};

export const assignComplaint = async (complaintId) => {
    return apiHelper(`/officer/complaints/${complaintId}/assign`, 'PATCH');
};