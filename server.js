const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root', // Change to your MySQL username
    password: '', // Change to your MySQL password
    database: 'login_system',
    charset: 'utf8mb4'
};

// Create database connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully!');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, remember_me } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Get user from database
        const [users] = await pool.execute(
            'SELECT id, username, email, password, is_admin, is_active FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            // Log failed attempt
            await pool.execute(
                'INSERT INTO login_attempts (email, ip_address, user_agent, success) VALUES (?, ?, ?, ?)',
                [email, req.ip, req.get('User-Agent'), false]
            );

            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate session token
        const sessionToken = generateToken();
        const rememberToken = remember_me ? generateToken() : null;
        const expiresAt = remember_me 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create session
        await pool.execute(
            'INSERT INTO user_sessions (user_id, session_token, remember_token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
            [user.id, sessionToken, rememberToken, req.ip, req.get('User-Agent'), expiresAt]
        );

        // Update last login
        await pool.execute(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Log successful attempt
        await pool.execute(
            'INSERT INTO login_attempts (email, ip_address, user_agent, success) VALUES (?, ?, ?, ?)',
            [email, req.ip, req.get('User-Agent'), true]
        );

        // Set cookies
        res.cookie('sessionToken', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: remember_me ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
        });

        if (remember_me && rememberToken) {
            res.cookie('rememberToken', rememberToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                is_admin: user.is_admin
            },
            redirect: '/dashboard.html'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during login'
        });
    }
});

// Logout endpoint
app.post('/api/logout', async (req, res) => {
    try {
        const sessionToken = req.cookies.sessionToken;
        
        if (sessionToken) {
            // Deactivate session
            await pool.execute(
                'UPDATE user_sessions SET is_active = FALSE WHERE session_token = ?',
                [sessionToken]
            );
        }

        // Clear cookies
        res.clearCookie('sessionToken');
        res.clearCookie('rememberToken');

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during logout'
        });
    }
});

// Check session endpoint
app.get('/api/check-session', async (req, res) => {
    try {
        const sessionToken = req.cookies.sessionToken;
        const rememberToken = req.cookies.rememberToken;

        if (!sessionToken && !rememberToken) {
            return res.json({
                success: false,
                message: 'No active session'
            });
        }

        let token = sessionToken || rememberToken;
        let query = sessionToken 
            ? 'SELECT us.*, u.username, u.email, u.is_admin FROM user_sessions us JOIN users u ON us.user_id = u.id WHERE us.session_token = ? AND us.is_active = TRUE AND us.expires_at > NOW()'
            : 'SELECT us.*, u.username, u.email, u.is_admin FROM user_sessions us JOIN users u ON us.user_id = u.id WHERE us.remember_token = ? AND us.is_active = TRUE AND us.expires_at > NOW()';

        const [sessions] = await pool.execute(query, [token]);

        if (sessions.length === 0) {
            // Clear invalid cookies
            res.clearCookie('sessionToken');
            res.clearCookie('rememberToken');

            return res.json({
                success: false,
                message: 'Session expired'
            });
        }

        const session = sessions[0];

        res.json({
            success: true,
            user: {
                id: session.user_id,
                username: session.username,
                email: session.email,
                is_admin: session.is_admin
            }
        });

    } catch (error) {
        console.error('Session check error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred checking session'
        });
    }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, first_name, last_name } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, and password are required'
            });
        }

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password, first_name, last_name, email_verified) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, first_name || null, last_name || null, true]
        );

        res.json({
            success: true,
            message: 'User registered successfully',
            user_id: result.insertId
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during registration'
        });
    }
});

// Utility function to generate tokens
function generateToken() {
    return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    await testConnection();
});

module.exports = app;
