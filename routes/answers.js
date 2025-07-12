const express = require('express');
const router = express.Router();
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const Notification = require('../models/Notification');
const { auth, userAuth, adminAuth, verifyOwnership } = require('../middleware/auth');
const { answerValidation, commentValidation, voteValidation, paginationValidation } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// @route   GET /api/answers
// @desc    Get answers with pagination and filtering
// @access  Public
router.get('/',
  optionalAuth,
  paginationValidation,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      questionId,
      author,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = { isDeleted: false };

    if (questionId) {
      query.question = questionId;
    }

    if (author) {
      query.author = author;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const answers = await Answer.find(query)
      .populate('author', 'username avatar reputation')
      .populate('question', 'title')
      .populate('comments.author', 'username avatar')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Answer.countDocuments(query);

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

// @route   GET /api/answers/:id
// @desc    Get answer by ID
// @access  Public
router.get('/:id',
  optionalAuth,
  answerValidation.id,
  asyncHandler(async (req, res) => {
    const answer = await Answer.findById(req.params.id)
      .populate('author', 'username avatar reputation bio')
      .populate('question', 'title tags')
      .populate('comments.author', 'username avatar')
      .populate('editHistory.editor', 'username');

    if (!answer || answer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    res.json({
      success: true,
      data: {
        answer
      }
    });
  })
);

// @route   POST /api/answers
// @desc    Create a new answer
// @access  Private
router.post('/',
  auth,
  userAuth,
  answerValidation.create,
  asyncHandler(async (req, res) => {
    const { content, questionId } = req.body;

    // Check if question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if question is closed
    if (question.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot answer a closed question'
      });
    }

    // Check if user has already answered this question
    const existingAnswer = await Answer.findOne({
      question: questionId,
      author: req.user._id,
      isDeleted: false
    });

    if (existingAnswer) {
      return res.status(400).json({
        success: false,
        message: 'You have already answered this question'
      });
    }

    // Create answer
    const answer = await Answer.create({
      content,
      question: questionId,
      author: req.user._id
    });

    // Add answer to question
    await question.addAnswer(answer._id);

    // Populate answer with author info
    await answer.populate('author', 'username avatar reputation');

    // Create notification for question author
    if (question.author.toString() !== req.user._id.toString()) {
      await Notification.createNotification({
        recipient: question.author,
        sender: req.user._id,
        type: 'answer_received',
        title: 'New answer received',
        message: `Someone answered your question "${question.title}"`,
        data: {
          questionId: question._id,
          answerId: answer._id
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Answer created successfully',
      data: {
        answer
      }
    });
  })
);

// @route   PUT /api/answers/:id
// @desc    Update answer
// @access  Private
router.put('/:id',
  auth,
  userAuth,
  answerValidation.id,
  answerValidation.update,
  verifyOwnership(Answer),
  asyncHandler(async (req, res) => {
    const { content } = req.body;

    // Add to edit history
    const updates = {
      content,
      editHistory: [
        ...req.resource.editHistory,
        {
          editor: req.user._id,
          previousContent: req.resource.content
        }
      ]
    };

    const updatedAnswer = await Answer.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('author', 'username avatar reputation')
      .populate('editHistory.editor', 'username');

    res.json({
      success: true,
      message: 'Answer updated successfully',
      data: {
        answer: updatedAnswer
      }
    });
  })
);

// @route   DELETE /api/answers/:id
// @desc    Delete answer
// @access  Private
router.delete('/:id',
  auth,
  userAuth,
  answerValidation.id,
  verifyOwnership(Answer),
  asyncHandler(async (req, res) => {
    // Check if answer is accepted
    if (req.resource.isAccepted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an accepted answer'
      });
    }

    // Soft delete answer
    await req.resource.softDelete(req.user._id);

    // Remove answer from question
    await Question.findByIdAndUpdate(
      req.resource.question,
      { $pull: { answers: req.params.id } }
    );

    res.json({
      success: true,
      message: 'Answer deleted successfully'
    });
  })
);

// @route   POST /api/answers/:id/vote
// @desc    Vote on answer
// @access  Private
router.post('/:id/vote',
  auth,
  userAuth,
  answerValidation.id,
  voteValidation.vote,
  asyncHandler(async (req, res) => {
    const { voteType } = req.body;
    const answer = await Answer.findById(req.params.id);

    if (!answer || answer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Check if user is voting on their own answer
    if (answer.author.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot vote on your own answer'
      });
    }

    await answer.addVote(req.user._id, voteType);

    // Update author reputation
    const reputationChange = voteType === 'upvote' ? 10 : -2;
    await answer.populate('author');
    await answer.author.updateReputation(reputationChange);

    // Create notification for answer author
    await Notification.createNotification({
      recipient: answer.author._id,
      sender: req.user._id,
      type: 'answer_voted',
      title: 'Your answer received a vote',
      message: `Someone ${voteType}d your answer`,
      data: {
        questionId: answer.question,
        answerId: answer._id,
        voteType
      }
    });

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        voteCount: answer.voteCount
      }
    });
  })
);

// @route   POST /api/answers/:id/comments
// @desc    Add comment to answer
// @access  Private
router.post('/:id/comments',
  auth,
  userAuth,
  answerValidation.id,
  commentValidation.create,
  asyncHandler(async (req, res) => {
    const { content } = req.body;
    const answer = await Answer.findById(req.params.id);

    if (!answer || answer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    await answer.addComment(req.user._id, content);

    // Get the last comment (the one we just added)
    const comment = answer.comments[answer.comments.length - 1];
    await comment.populate('author', 'username avatar');

    // Create notification for answer author
    if (answer.author.toString() !== req.user._id.toString()) {
      await Notification.createNotification({
        recipient: answer.author,
        sender: req.user._id,
        type: 'comment_received',
        title: 'New comment on your answer',
        message: `Someone commented on your answer`,
        data: {
          questionId: answer.question,
          answerId: answer._id,
          commentId: comment._id
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        comment
      }
    });
  })
);

// @route   PUT /api/answers/:id/comments/:commentId
// @desc    Update comment
// @access  Private
router.put('/:id/comments/:commentId',
  auth,
  userAuth,
  answerValidation.id,
  commentValidation.update,
  asyncHandler(async (req, res) => {
    const { content } = req.body;
    const answer = await Answer.findById(req.params.id);

    if (!answer || answer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    const comment = answer.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user owns the comment or is admin
    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own comments'
      });
    }

    await answer.editComment(req.params.commentId, content);

    res.json({
      success: true,
      message: 'Comment updated successfully'
    });
  })
);

// @route   DELETE /api/answers/:id/comments/:commentId
// @desc    Delete comment
// @access  Private
router.delete('/:id/comments/:commentId',
  auth,
  userAuth,
  answerValidation.id,
  asyncHandler(async (req, res) => {
    const answer = await Answer.findById(req.params.id);

    if (!answer || answer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    const comment = answer.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user owns the comment or is admin
    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own comments'
      });
    }

    await answer.removeComment(req.params.commentId);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  })
);

// @route   POST /api/answers/:id/restore
// @desc    Restore deleted answer (admin only)
// @access  Private
router.post('/:id/restore',
  auth,
  adminAuth,
  answerValidation.id,
  asyncHandler(async (req, res) => {
    const answer = await Answer.findById(req.params.id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    if (!answer.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Answer is not deleted'
      });
    }

    await answer.restore();

    // Add answer back to question
    await Question.findByIdAndUpdate(
      answer.question,
      { $addToSet: { answers: answer._id } }
    );

    res.json({
      success: true,
      message: 'Answer restored successfully'
    });
  })
);

// @route   GET /api/answers/user/:userId
// @desc    Get answers by user
// @access  Public
router.get('/user/:userId',
  optionalAuth,
  paginationValidation,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const answers = await Answer.find({
      author: userId,
      isDeleted: false
    })
      .populate('author', 'username avatar reputation')
      .populate('question', 'title tags')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Answer.countDocuments({
      author: userId,
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

module.exports = router; 