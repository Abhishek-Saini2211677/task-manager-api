const { matchedData } = require('express-validator');
const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { UPDATABLE_FIELDS } = require('../validators/task.validator');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Only whitelisted (and already validated/sanitised) fields ever reach the
// database, so clients cannot set things like `user` or `_id` themselves.
const pickTaskFields = (body) => UPDATABLE_FIELDS.reduce((acc, key) => {
  if (body[key] !== undefined) acc[key] = body[key];
  if (key === 'description' && body[key] === null) acc[key] = '';
  return acc;
}, {});

/**
 * Every query is scoped to the authenticated user, so one user can never
 * read or modify another user's tasks (a foreign id simply returns 404).
 */
const findOwnTask = async (id, userId) => {
  const task = await Task.findOne({ _id: id, user: userId });
  if (!task) throw ApiError.notFound('Task not found');
  return task;
};

/**
 * POST /api/tasks
 */
const createTask = asyncHandler(async (req, res) => {
  const task = await Task.create({ ...pickTaskFields(req.body), user: req.user._id });
  res.status(201).json({ success: true, message: 'Task created successfully', data: { task } });
});

/**
 * GET /api/tasks?search=&status=&priority=&page=&limit=&sortBy=&order=
 */
const getTasks = asyncHandler(async (req, res) => {
  const {
    search, status, priority, page = 1, limit = 10, sortBy = 'createdAt', order = 'desc',
  } = matchedData(req, { locations: ['query'] });

  const filter = { user: req.user._id };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: order === 'asc' ? 1 : -1, _id: 1 };

  const [tasks, total] = await Promise.all([
    Task.find(filter).sort(sort).skip(skip).limit(limit),
    Task.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    success: true,
    data: {
      tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  });
});

/**
 * GET /api/tasks/:id
 */
const getTask = asyncHandler(async (req, res) => {
  const task = await findOwnTask(req.params.id, req.user._id);
  res.status(200).json({ success: true, data: { task } });
});

/**
 * PUT /api/tasks/:id
 */
const updateTask = asyncHandler(async (req, res) => {
  const task = await findOwnTask(req.params.id, req.user._id);
  Object.assign(task, pickTaskFields(req.body));
  await task.save();
  res.status(200).json({ success: true, message: 'Task updated successfully', data: { task } });
});

/**
 * DELETE /api/tasks/:id
 */
const deleteTask = asyncHandler(async (req, res) => {
  const task = await findOwnTask(req.params.id, req.user._id);
  await task.deleteOne();
  res.status(200).json({ success: true, message: 'Task deleted successfully' });
});

module.exports = { createTask, getTasks, getTask, updateTask, deleteTask };
