const router = require('express').Router();
const taskController = require('../controllers/task.controller');
const taskValidator = require('../validators/task.validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

// Every task route requires a valid JWT
router.use(protect);

router.route('/')
  .post(taskValidator.create, validate, taskController.createTask)
  .get(taskValidator.list, validate, taskController.getTasks);

router.route('/:id')
  .get(taskValidator.idParam, validate, taskController.getTask)
  .put(taskValidator.update, validate, taskController.updateTask)
  .delete(taskValidator.idParam, validate, taskController.deleteTask);

module.exports = router;
