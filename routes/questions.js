const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Tag = require('../models/Tag');
const Notification = require('../models/Notification');
const { auth, optionalAuth, userAuth, adminAuth, verifyOwnership } = require('../middleware/auth');
const { questionValidation, paginationValidation } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// @route   GET /api/questions
// @desc    Get all questions with pagination and filtering
// @access  Public
router.get('/',
  optionalAuth,
  paginationValidation,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      tags,
      author,
      status = 'open',
      answered
    } = req.query;

    let query = {};

    // Filter by tags
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    // Filter by author
    if (author) {
      query.author = author;
    }

    // Filter by status
    if (status !== 'all') {
      query.status = status;
    }

    // Filter by answered status
    if (answered === 'true') {
      query.acceptedAnswer = { $exists: true, $ne: null };
    } else if (answered === 'false') {
      query.acceptedAnswer = { $exists: false };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const questions = await Question.find(query)
      .populate('author', 'username avatar reputation')
      .populate('acceptedAnswer')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Question.countDocuments(query);

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

// @route   GET /api/questions/search
// @desc    Search questions
// @access  Public
router.get('/search',
  optionalAuth,
  questionValidation.search,
  asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 10, tags, author } = req.query;

    const questions = await Question.search(q, {
      page: parseInt(page),
      limit: parseInt(limit),
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      author
    });

    const total = await Question.countDocuments(
      q ? { $text: { $search: q } } : {}
    );

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

// @route   GET /api/questions/:id
// @desc    Get question by ID
// @access  Public
router.get('/:id',
  optionalAuth,
  questionValidation.id,
  asyncHandler(async (req, res) => {
    const question = await Question.findById(req.params.id)
      .populate('author', 'username avatar reputation bio')
      .populate('acceptedAnswer')
      .populate('editHistory.editor', 'username');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Increment view count if user is authenticated
    if (req.user) {
      await question.incrementViews();
    }

    // Get answers for this question
    const answers = await Answer.findByQuestion(req.params.id, {
      sortBy: 'isAccepted',
      sortOrder: 'desc'
    });

    res.json({
      success: true,
      data: {
        question,
        answers
      }
    });
  })
);

// @route   POST /api/questions
// @desc    Create a new question
// @access  Private
router.post('/',
  auth,
  userAuth,
  questionValidation.create,
  asyncHandler(async (req, res) => {
    const { title, description, tags } = req.body;

    // Process tags
    const processedTags = tags.map(tag => tag.toLowerCase().trim());
    
    // Create or update tags
    for (const tagName of processedTags) {
      await Tag.findOrCreate(tagName);
    }

    // Create question
    const question = await Question.create({
      title,
      description,
      tags: processedTags,
      author: req.user._id
    });

    // Populate author info
    await question.populate('author', 'username avatar reputation');

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: {
        question
      }
    });
  })
);

// @route   PUT /api/questions/:id
// @desc    Update question
// @access  Private
router.put('/:id',
  auth,
  userAuth,
  questionValidation.id,
  questionValidation.update,
  verifyOwnership(Question),
  asyncHandler(async (req, res) => {
    const { title, description, tags } = req.body;
    const updates = {};

    if (title) updates.title = title;
    if (description) updates.description = description;
    if (tags) {
      const processedTags = tags.map(tag => tag.toLowerCase().trim());
      
      // Create or update tags
      for (const tagName of processedTags) {
        await Tag.findOrCreate(tagName);
      }
      
      updates.tags = processedTags;
    }

    // Add to edit history
    updates.editHistory = [
      ...req.resource.editHistory,
      {
        editor: req.user._id,
        previousContent: {
          title: req.resource.title,
          description: req.resource.description,
          tags: req.resource.tags
        }
      }
    ];

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('author', 'username avatar reputation')
      .populate('editHistory.editor', 'username');

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: {
        question: updatedQuestion
      }
    });
  })
);

// @route   DELETE /api/questions/:id
// @desc    Delete question
// @access  Private
router.delete('/:id',
  auth,
  userAuth,
  questionValidation.id,
  verifyOwnership(Question),
  asyncHandler(async (req, res) => {
    // Check if question has answers
    const answerCount = await Answer.countDocuments({ 
      question: req.params.id,
      isDeleted: false
    });

    if (answerCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete question with answers. Please delete all answers first.'
      });
    }

    await Question.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  })
);

// @route   POST /api/questions/:id/vote
// @desc    Vote on question
// @access  Private
router.post('/:id/vote',
  auth,
  userAuth,
  questionValidation.id,
  asyncHandler(async (req, res) => {
    const { voteType } = req.body;
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user is voting on their own question
    if (question.author.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot vote on your own question'
      });
    }

    await question.addVote(req.user._id, voteType);

    // Update author reputation
    const reputationChange = voteType === 'upvote' ? 10 : -2;
    await question.populate('author');
    await question.author.updateReputation(reputationChange);

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        voteCount: question.voteCount
      }
    });
  })
);

// @route   POST /api/questions/:id/accept-answer/:answerId
// @desc    Accept an answer
// @access  Private
router.post('/:id/accept-answer/:answerId',
  auth,
  userAuth,
  questionValidation.id,
  asyncHandler(async (req, res) => {
    const { answerId } = req.params;
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user owns the question
    if (question.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the question author can accept answers'
      });
    }

    const answer = await Answer.findById(answerId);
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Check if answer belongs to this question
    if (answer.question.toString() !== req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Answer does not belong to this question'
      });
    }

    // Unaccept previous answer if exists
    if (question.acceptedAnswer) {
      const previousAnswer = await Answer.findById(question.acceptedAnswer);
      if (previousAnswer) {
        await previousAnswer.unaccept();
        // Remove reputation from previous answer author
        await previousAnswer.populate('author');
        await previousAnswer.author.updateReputation(-15);
      }
    }

    // Accept new answer
    await answer.accept();
    await question.acceptAnswer(answerId);

    // Add reputation to answer author
    await answer.populate('author');
    await answer.author.updateReputation(15);

    // Create notification
    await Notification.createNotification({
      recipient: answer.author._id,
      sender: req.user._id,
      type: 'answer_accepted',
      title: 'Your answer was accepted!',
      message: `Your answer to "${question.title}" was accepted by the question author.`,
      data: {
        questionId: question._id,
        answerId: answer._id
      }
    });

    res.json({
      success: true,
      message: 'Answer accepted successfully'
    });
  })
);

// @route   POST /api/questions/:id/unaccept-answer
// @desc    Unaccept an answer
// @access  Private
router.post('/:id/unaccept-answer',
  auth,
  userAuth,
  questionValidation.id,
  asyncHandler(async (req, res) => {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user owns the question
    if (question.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the question author can unaccept answers'
      });
    }

    if (!question.acceptedAnswer) {
      return res.status(400).json({
        success: false,
        message: 'No answer is currently accepted'
      });
    }

    // Unaccept answer
    const answer = await Answer.findById(question.acceptedAnswer);
    if (answer) {
      await answer.unaccept();
      // Remove reputation from answer author
      await answer.populate('author');
      await answer.author.updateReputation(-15);
    }

    question.acceptedAnswer = null;
    await question.save();

    res.json({
      success: true,
      message: 'Answer unaccepted successfully'
    });
  })
);

// @route   PUT /api/questions/:id/status
// @desc    Update question status (admin only)
// @access  Private
router.put('/:id/status',
  auth,
  adminAuth,
  questionValidation.id,
  asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!['open', 'closed', 'duplicate', 'on-hold'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('author', 'username avatar reputation');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      message: 'Question status updated successfully',
      data: {
        question
      }
    });
  })
);

// @route   GET /api/questions/tags/popular
// @desc    Get popular tags
// @access  Public
router.get('/tags/popular', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const tags = await Tag.findPopular(parseInt(limit));

  res.json({
    success: true,
    data: {
      tags
    }
  });
}));

module.exports = router; 