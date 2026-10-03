const { body, param, query } = require('express-validator');
const { TASK_STATUS, TASK_PRIORITY } = require('../utils/constants');

const idParam = [param('id').isMongoId().withMessage('Invalid task id')];

const UPDATABLE_FIELDS = Object.freeze(['title', 'description', 'status', 'priority', 'dueDate']);

const taskFields = (isUpdate = false) => {
  const title = isUpdate
    ? body('title').optional()
    : body('title').exists({ values: 'null' }).withMessage('Title is required').bail();
  return [
    title
      .isString().withMessage('Title must be a string').bail()
      .trim().notEmpty().withMessage('Title cannot be empty').bail()
      .isLength({ max: 100 }).withMessage('Title must be at most 100 characters'),
    body('description').optional({ values: 'null' })
      .isString().withMessage('Description must be a string')
      .trim().isLength({ max: 1000 }).withMessage('Description must be at most 1000 characters'),
    body('status').optional()
      .isIn(TASK_STATUS).withMessage(`Status must be one of: ${TASK_STATUS.join(', ')}`),
    body('priority').optional()
      .isIn(TASK_PRIORITY).withMessage(`Priority must be one of: ${TASK_PRIORITY.join(', ')}`),
    body('dueDate').optional({ values: 'null' })
      .isISO8601().withMessage('Due date must be a valid ISO 8601 date (e.g. 2026-12-31)').toDate(),
  ];
};

const create = taskFields(false);

const update = [
  ...idParam,
  ...taskFields(true),
  body().custom((value) => {
    if (!value || !Object.keys(value).some((k) => UPDATABLE_FIELDS.includes(k))) {
      throw new Error(`Provide at least one field to update: ${UPDATABLE_FIELDS.join(', ')}`);
    }
    return true;
  }),
];

const list = [
  query('status').optional()
    .isIn(TASK_STATUS).withMessage(`Status must be one of: ${TASK_STATUS.join(', ')}`),
  query('priority').optional()
    .isIn(TASK_PRIORITY).withMessage(`Priority must be one of: ${TASK_PRIORITY.join(', ')}`),
  query('search').optional().isString().trim().isLength({ max: 100 })
    .withMessage('Search must be at most 100 characters'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100').toInt(),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'dueDate', 'title'])
    .withMessage('sortBy must be one of: createdAt, updatedAt, dueDate, title'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('order must be asc or desc'),
];

module.exports = { create, update, list, idParam, UPDATABLE_FIELDS };
