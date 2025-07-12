const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User validation rules
const userValidation = {
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    handleValidationErrors
  ],
  
  login: [
    body('identifier')
      .notEmpty()
      .withMessage('Username or email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ],
  
  updateProfile: [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    handleValidationErrors
  ]
};

// Question validation rules
const questionValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Title must be between 10 and 200 characters'),
    body('description')
      .trim()
      .isLength({ min: 20 })
      .withMessage('Description must be at least 20 characters long'),
    body('tags')
      .isArray({ min: 1, max: 5 })
      .withMessage('Please provide 1-5 tags')
      .custom((tags) => {
        if (!tags.every(tag => typeof tag === 'string' && tag.length >= 2 && tag.length <= 30)) {
          throw new Error('Each tag must be a string between 2 and 30 characters');
        }
        return true;
      }),
    handleValidationErrors
  ],
  
  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Title must be between 10 and 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 20 })
      .withMessage('Description must be at least 20 characters long'),
    body('tags')
      .optional()
      .isArray({ min: 1, max: 5 })
      .withMessage('Please provide 1-5 tags')
      .custom((tags) => {
        if (!tags.every(tag => typeof tag === 'string' && tag.length >= 2 && tag.length <= 30)) {
          throw new Error('Each tag must be a string between 2 and 30 characters');
        }
        return true;
      }),
    handleValidationErrors
  ],
  
  id: [
    param('id')
      .isMongoId()
      .withMessage('Invalid question ID'),
    handleValidationErrors
  ],
  
  search: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Search query must be at least 2 characters long'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    handleValidationErrors
  ]
};

// Answer validation rules
const answerValidation = {
  create: [
    body('content')
      .trim()
      .isLength({ min: 20 })
      .withMessage('Answer must be at least 20 characters long'),
    body('questionId')
      .isMongoId()
      .withMessage('Invalid question ID'),
    handleValidationErrors
  ],
  
  update: [
    body('content')
      .trim()
      .isLength({ min: 20 })
      .withMessage('Answer must be at least 20 characters long'),
    handleValidationErrors
  ],
  
  id: [
    param('id')
      .isMongoId()
      .withMessage('Invalid answer ID'),
    handleValidationErrors
  ]
};

// Comment validation rules
const commentValidation = {
  create: [
    body('content')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Comment must be between 1 and 500 characters'),
    handleValidationErrors
  ],
  
  update: [
    body('content')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Comment must be between 1 and 500 characters'),
    handleValidationErrors
  ]
};

// Vote validation rules
const voteValidation = {
  vote: [
    body('voteType')
      .isIn(['upvote', 'downvote'])
      .withMessage('Vote type must be either upvote or downvote'),
    handleValidationErrors
  ]
};

// Tag validation rules
const tagValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Tag name must be between 2 and 30 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Tag name can only contain lowercase letters, numbers, and hyphens'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    handleValidationErrors
  ],
  
  name: [
    param('name')
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Tag name must be between 2 and 30 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Tag name can only contain lowercase letters, numbers, and hyphens'),
    handleValidationErrors
  ]
};

// Notification validation rules
const notificationValidation = {
  markRead: [
    param('id')
      .isMongoId()
      .withMessage('Invalid notification ID'),
    handleValidationErrors
  ],
  
  list: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('unreadOnly')
      .optional()
      .isBoolean()
      .withMessage('unreadOnly must be a boolean'),
    handleValidationErrors
  ]
};

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// File upload validation
const fileUploadValidation = {
  image: [
    body('image')
      .optional()
      .custom((value, { req }) => {
        if (!req.file) {
          throw new Error('Image file is required');
        }
        
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(req.file.mimetype)) {
          throw new Error('Only JPEG, PNG, GIF, and WebP images are allowed');
        }
        
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxSize) {
          throw new Error('Image size must be less than 5MB');
        }
        
        return true;
      }),
    handleValidationErrors
  ]
};

module.exports = {
  handleValidationErrors,
  userValidation,
  questionValidation,
  answerValidation,
  commentValidation,
  voteValidation,
  tagValidation,
  notificationValidation,
  paginationValidation,
  fileUploadValidation
}; 