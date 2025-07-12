const express = require('express');
const router = express.Router();
const Tag = require('../models/Tag');
const Question = require('../models/Question');
const { auth, userAuth, adminAuth } = require('../middleware/auth');
const { tagValidation, paginationValidation } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// @route   GET /api/tags
// @desc    Get all tags with pagination and filtering
// @access  Public
router.get('/',
  paginationValidation,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      sortBy = 'usageCount',
      sortOrder = 'desc',
      isFeatured,
      isModerated
    } = req.query;

    let query = {};

    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured === 'true';
    }

    if (isModerated !== undefined) {
      query.isModerated = isModerated === 'true';
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tags = await Tag.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Tag.countDocuments(query);

    res.json({
      success: true,
      data: {
        tags,
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

// @route   GET /api/tags/popular
// @desc    Get popular tags
// @access  Public
router.get('/popular', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const tags = await Tag.findPopular(parseInt(limit));

  res.json({
    success: true,
    data: {
      tags
    }
  });
}));

// @route   GET /api/tags/featured
// @desc    Get featured tags
// @access  Public
router.get('/featured', asyncHandler(async (req, res) => {
  const tags = await Tag.findFeatured();

  res.json({
    success: true,
    data: {
      tags
    }
  });
}));

// @route   GET /api/tags/search
// @desc    Search tags
// @access  Public
router.get('/search', asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters long'
    });
  }

  const tags = await Tag.search(q, {
    page: parseInt(page),
    limit: parseInt(limit)
  });

  const total = await Tag.countDocuments({
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { synonyms: { $in: [new RegExp(q, 'i')] } }
    ]
  });

  res.json({
    success: true,
    data: {
      tags,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// @route   GET /api/tags/:name
// @desc    Get tag by name
// @access  Public
router.get('/:name',
  tagValidation.name,
  asyncHandler(async (req, res) => {
    const { name } = req.params;

    const tag = await Tag.findOne({ name: name.toLowerCase() });
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Get questions with this tag
    const questions = await Question.find({ tags: tag.name })
      .populate('author', 'username avatar reputation')
      .populate('acceptedAnswer')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get related tags
    const relatedTags = await Tag.find({
      _id: { $in: tag.relatedTags },
      isModerated: false
    }).limit(5);

    res.json({
      success: true,
      data: {
        tag,
        questions,
        relatedTags
      }
    });
  })
);

// @route   POST /api/tags
// @desc    Create a new tag (admin only)
// @access  Private
router.post('/',
  auth,
  adminAuth,
  tagValidation.create,
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    // Check if tag already exists
    const existingTag = await Tag.findOne({ name: name.toLowerCase() });
    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: 'Tag already exists'
      });
    }

    const tag = await Tag.create({
      name,
      description,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Tag created successfully',
      data: {
        tag
      }
    });
  })
);

// @route   PUT /api/tags/:name
// @desc    Update tag (admin only)
// @access  Private
router.put('/:name',
  auth,
  adminAuth,
  tagValidation.name,
  asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { description, isFeatured, isModerated } = req.body;

    const tag = await Tag.findOne({ name: name.toLowerCase() });
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    const updates = {};
    if (description !== undefined) updates.description = description;
    if (isFeatured !== undefined) updates.isFeatured = isFeatured;
    if (isModerated !== undefined) updates.isModerated = isModerated;

    const updatedTag = await Tag.findByIdAndUpdate(
      tag._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Tag updated successfully',
      data: {
        tag: updatedTag
      }
    });
  })
);

// @route   DELETE /api/tags/:name
// @desc    Delete tag (admin only)
// @access  Private
router.delete('/:name',
  auth,
  adminAuth,
  tagValidation.name,
  asyncHandler(async (req, res) => {
    const { name } = req.params;

    const tag = await Tag.findOne({ name: name.toLowerCase() });
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Check if tag is being used
    const questionsCount = await Question.countDocuments({ tags: tag.name });
    if (questionsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete tag. It is used by ${questionsCount} questions.`
      });
    }

    await Tag.findByIdAndDelete(tag._id);

    res.json({
      success: true,
      message: 'Tag deleted successfully'
    });
  })
);

// @route   POST /api/tags/:name/synonyms
// @desc    Add synonym to tag (admin only)
// @access  Private
router.post('/:name/synonyms',
  auth,
  adminAuth,
  tagValidation.name,
  asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { synonym } = req.body;

    if (!synonym) {
      return res.status(400).json({
        success: false,
        message: 'Synonym is required'
      });
    }

    const tag = await Tag.findOne({ name: name.toLowerCase() });
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    await tag.addSynonym(synonym.toLowerCase());

    res.json({
      success: true,
      message: 'Synonym added successfully',
      data: {
        synonyms: tag.synonyms
      }
    });
  })
);

// @route   DELETE /api/tags/:name/synonyms/:synonym
// @desc    Remove synonym from tag (admin only)
// @access  Private
router.delete('/:name/synonyms/:synonym',
  auth,
  adminAuth,
  tagValidation.name,
  asyncHandler(async (req, res) => {
    const { name, synonym } = req.params;

    const tag = await Tag.findOne({ name: name.toLowerCase() });
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    await tag.removeSynonym(synonym.toLowerCase());

    res.json({
      success: true,
      message: 'Synonym removed successfully',
      data: {
        synonyms: tag.synonyms
      }
    });
  })
);

// @route   POST /api/tags/:name/related
// @desc    Add related tag (admin only)
// @access  Private
router.post('/:name/related',
  auth,
  adminAuth,
  tagValidation.name,
  asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { relatedTagName } = req.body;

    if (!relatedTagName) {
      return res.status(400).json({
        success: false,
        message: 'Related tag name is required'
      });
    }

    const tag = await Tag.findOne({ name: name.toLowerCase() });
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    const relatedTag = await Tag.findOne({ name: relatedTagName.toLowerCase() });
    if (!relatedTag) {
      return res.status(404).json({
        success: false,
        message: 'Related tag not found'
      });
    }

    await tag.addRelatedTag(relatedTag._id);

    res.json({
      success: true,
      message: 'Related tag added successfully',
      data: {
        relatedTags: tag.relatedTags
      }
    });
  })
);

// @route   DELETE /api/tags/:name/related/:relatedTagName
// @desc    Remove related tag (admin only)
// @access  Private
router.delete('/:name/related/:relatedTagName',
  auth,
  adminAuth,
  tagValidation.name,
  asyncHandler(async (req, res) => {
    const { name, relatedTagName } = req.params;

    const tag = await Tag.findOne({ name: name.toLowerCase() });
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    const relatedTag = await Tag.findOne({ name: relatedTagName.toLowerCase() });
    if (!relatedTag) {
      return res.status(404).json({
        success: false,
        message: 'Related tag not found'
      });
    }

    await tag.removeRelatedTag(relatedTag._id);

    res.json({
      success: true,
      message: 'Related tag removed successfully',
      data: {
        relatedTags: tag.relatedTags
      }
    });
  })
);

// @route   GET /api/tags/stats/overview
// @desc    Get tag statistics (admin only)
// @access  Private
router.get('/stats/overview',
  auth,
  adminAuth,
  asyncHandler(async (req, res) => {
    const stats = await Tag.getStatistics();

    res.json({
      success: true,
      data: {
        stats: stats[0] || {
          totalTags: 0,
          totalUsage: 0,
          totalQuestions: 0,
          averageUsage: 0,
          featuredTags: 0,
          moderatedTags: 0
        }
      }
    });
  })
);

// @route   POST /api/tags/update-counts
// @desc    Update all tag question counts (admin only)
// @access  Private
router.post('/update-counts',
  auth,
  adminAuth,
  asyncHandler(async (req, res) => {
    await Tag.updateAllQuestionCounts();

    res.json({
      success: true,
      message: 'Tag question counts updated successfully'
    });
  })
);

// @route   GET /api/tags/suggestions
// @desc    Get tag suggestions based on input
// @access  Public
router.get('/suggestions', asyncHandler(async (req, res) => {
  const { q, limit = 5 } = req.query;

  if (!q || q.length < 1) {
    return res.status(400).json({
      success: false,
      message: 'Query parameter is required'
    });
  }

  const suggestions = await Tag.find({
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { synonyms: { $in: [new RegExp(q, 'i')] } }
    ],
    isModerated: false
  })
    .select('name description usageCount')
    .sort({ usageCount: -1 })
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: {
      suggestions
    }
  });
}));

module.exports = router; 