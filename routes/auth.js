const express = require('express');
const router = express.Router();
const { auth, generateToken, actionRateLimit } = require('../middleware/auth');
const { userValidation } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', 
  userValidation.register,
  actionRateLimit('register', 3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const db = req.app.get('db');

    // Initialize User model with database connection
    const User = require('../models/User');
    const userModel = new User(db);

    // Check if user already exists
    const existingUser = await userModel.findByUsernameOrEmail(username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this username or email'
      });
    }

    // Check if email already exists
    const existingEmail = await userModel.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    // Create new user
    const user = await userModel.create({
      username,
      email,
      password
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userModel.getPublicProfile(user),
        token
      }
    });
  })
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login',
  userValidation.login,
  actionRateLimit('login', 5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const db = req.app.get('db');

    // Initialize User model with database connection
    const User = require('../models/User');
    const userModel = new User(db);

    // Find user by username or email
    const user = await userModel.findByUsernameOrEmail(identifier);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await userModel.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Note: is_active check removed since current database schema doesn't include this column

    // Update last login
    await userModel.updateLastLogin(user.id);

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userModel.getPublicProfile(user),
        token
      }
    });
  })
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, asyncHandler(async (req, res) => {
  const db = req.app.get('db');
  const User = require('../models/User');
  const userModel = new User(db);

  // Get fresh user data
  const user = await userModel.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: {
      user: userModel.getPublicProfile(user)
    }
  });
}));

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile',
  auth,
  userValidation.updateProfile,
  asyncHandler(async (req, res) => {
    const { username, bio, avatar } = req.body;
    const db = req.app.get('db');
    const User = require('../models/User');
    const userModel = new User(db);

    const updates = {};

    if (username) {
      // Check if username is already taken
      const existingUser = await userModel.findByUsername(username);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }
      updates.username = username;
    }

    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    const success = await userModel.update(req.user.id, updates);
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }

    // Get updated user
    const updatedUser = await userModel.findById(req.user.id);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userModel.getPublicProfile(updatedUser)
      }
    });
  })
);

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put('/password',
  auth,
  actionRateLimit('password_change', 3, 60 * 60 * 1000), // 3 attempts per hour
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const db = req.app.get('db');
    const User = require('../models/User');
    const userModel = new User(db);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await userModel.comparePassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    const success = await userModel.updatePassword(req.user.id, newPassword);
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, asyncHandler(async (req, res) => {
  // In a JWT-based system, logout is typically handled client-side
  // by removing the token. However, we can implement server-side
  // logout by maintaining a blacklist of tokens if needed.
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', auth, asyncHandler(async (req, res) => {
  const db = req.app.get('db');
  const User = require('../models/User');
  const userModel = new User(db);

  // Get fresh user data
  const user = await userModel.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Generate new token
  const token = generateToken(user.id);

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      user: userModel.getPublicProfile(user),
      token
    }
  });
}));

module.exports = router; 