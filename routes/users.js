const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { auth, userAuth, adminAuth } = require('../middleware/auth');
const { paginationValidation } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// @route   GET /api/users
// @desc    Get all users with pagination and filtering
// @access  Private (Admin only)
router.get('/',
  auth,
  adminAuth,
  paginationValidation,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = {};

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .select('-password')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  })
);

// @route   GET /api/users/:id
// @desc    Get user profile by ID
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get user statistics
  const questionsCount = await Question.countDocuments({ author: user._id });
  const answersCount = await Answer.countDocuments({ 
    author: user._id,
    isDeleted: false
  });
  const acceptedAnswersCount = await Answer.countDocuments({
    author: user._id,
    isAccepted: true,
    isDeleted: false
  });

  const userProfile = {
    ...user.getPublicProfile(),
    stats: {
      questionsCount,
      answersCount,
      acceptedAnswersCount
    }
  };

  res.json({
    success: true,
    data: {
      user: userProfile
    }
  });
}));

// @route   GET /api/users/:id/questions
// @desc    Get questions by user
// @access  Public
router.get('/:id/questions',
  paginationValidation,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const questions = await Question.find({ author: id })
      .populate('author', 'username avatar reputation')
      .populate('acceptedAnswer')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Question.countDocuments({ author: id });

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  })
);

// @route   GET /api/users/:id/answers
// @desc    Get answers by user
// @access  Public
router.get('/:id/answers',
  paginationValidation,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const answers = await Answer.find({
      author: id,
      isDeleted: false
    })
      .populate('author', 'username avatar reputation')
      .populate('question', 'title tags')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Answer.countDocuments({
      author: id,
      isDeleted: false
    });

    res.json({
      success: true,
      data: {
        answers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  })
);

// @route   PUT /api/users/:id/role
// @desc    Update user role (admin only)
// @access  Private
router.put('/:id/role',
  auth,
  adminAuth,
  asyncHandler(async (req, res) => {
    const { role } = req.body;

    if (!['guest', 'user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user
      }
    });
  })
);

// @route   PUT /api/users/:id/status
// @desc    Update user status (admin only)
// @access  Private
router.put('/:id/status',
  auth,
  adminAuth,
  asyncHandler(async (req, res) => {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user
      }
    });
  })
);

// @route   POST /api/users/:id/badges
// @desc    Add badge to user (admin only)
// @access  Private
router.post('/:id/badges',
  auth,
  adminAuth,
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Badge name is required'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if badge already exists
    const existingBadge = user.badges.find(badge => badge.name === name);
    if (existingBadge) {
      return res.status(400).json({
        success: false,
        message: 'User already has this badge'
      });
    }

    user.badges.push({
      name,
      description: description || ''
    });

    await user.save();

    res.json({
      success: true,
      message: 'Badge added successfully',
      data: {
        badges: user.badges
      }
    });
  })
);

// @route   DELETE /api/users/:id/badges/:badgeName
// @desc    Remove badge from user (admin only)
// @access  Private
router.delete('/:id/badges/:badgeName',
  auth,
  adminAuth,
  asyncHandler(async (req, res) => {
    const { badgeName } = req.params;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const badgeIndex = user.badges.findIndex(badge => badge.name === badgeName);
    if (badgeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found'
      });
    }

    user.badges.splice(badgeIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Badge removed successfully',
      data: {
        badges: user.badges
      }
    });
  })
);

// @route   GET /api/users/leaderboard
// @desc    Get user leaderboard
// @access  Public
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { limit = 10, period = 'all' } = req.query;

  let dateFilter = {};
  if (period === 'week') {
    dateFilter = { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
  } else if (period === 'month') {
    dateFilter = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
  }

  const users = await User.find({ isActive: true })
    .select('username avatar reputation badges')
    .sort({ reputation: -1 })
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: {
      users,
      period
    }
  });
}));

// @route   GET /api/users/search
// @desc    Search users
// @access  Public
router.get('/search', asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters long'
    });
  }

  const query = {
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { bio: { $regex: q, $options: 'i' } }
    ],
    isActive: true
  };

  const users = await User.find(query)
    .select('username avatar reputation bio')
    .sort({ reputation: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// @route   GET /api/users/stats/overview
// @desc    Get platform statistics (admin only)
// @access  Private
router.get('/stats/overview',
  auth,
  adminAuth,
  asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalQuestions = await Question.countDocuments();
    const totalAnswers = await Answer.countDocuments({ isDeleted: false });
    const acceptedAnswers = await Answer.countDocuments({ 
      isAccepted: true,
      isDeleted: false
    });

    // Recent activity (last 7 days)
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsers = await User.countDocuments({ createdAt: { $gte: lastWeek } });
    const newQuestions = await Question.countDocuments({ createdAt: { $gte: lastWeek } });
    const newAnswers = await Answer.countDocuments({ 
      createdAt: { $gte: lastWeek },
      isDeleted: false
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          totalQuestions,
          totalAnswers,
          acceptedAnswers
        },
        recentActivity: {
          newUsers,
          newQuestions,
          newAnswers
        }
      }
    });
  })
);

module.exports = router; 