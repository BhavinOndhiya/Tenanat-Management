import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/auth/login');
    };

    return (
        <nav>
            <h1>Citizen Portal</h1>
            <ul>
                {user ? (
                    <>
                        <li>Welcome, {user.name}</li>
                        <li><Link to="/dashboard">Dashboard</Link></li>
                        <li><button onClick={handleLogout}>Logout</button></li>
                    </>
                ) : (
                    <>
                        <li><Link to="/auth/login">Login</Link></li>
                        <li><Link to="/auth/register">Register</Link></li>
                    </>
                )}
            </ul>
        </nav>
    );
};

export default Navbar;