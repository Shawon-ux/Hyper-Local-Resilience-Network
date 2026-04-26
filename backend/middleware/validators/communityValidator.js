const { body } = require('express-validator');

exports.createCommunityValidator = [
  body('name').trim().isLength({ min: 2 }).withMessage('Community name must be at least 2 characters'),
  body('description').optional().isString().withMessage('Description must be a string'),
];
