const bcrypt = require('bcrypt');
const jwt = require('../utils/jwt');
const prisma = require('../db/prisma');

// Register a new user (defaults to CITIZEN role)
exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password_hash: passwordHash,
                role: 'CITIZEN', // Default role for new registrations
            },
        });

        const token = jwt.generateToken({ id: user.id, email: user.email, role: user.role });

        return res.status(201).json({
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            token,
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Login a user
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.generateToken({ id: user.id, email: user.email, role: user.role });

        return res.status(200).json({
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            token,
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Get current user info (also used as getMe)
exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } catch (error) {
        console.error('Get me error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Alias for getMe (for backward compatibility)
exports.getCurrentUser = exports.getMe;