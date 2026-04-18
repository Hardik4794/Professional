const express = require('express');
const router = express.Router();
const {
  createTask, getAllTasks, getTask, updateTask, deleteTask, getTaskStats
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getTaskStats);
router.route('/').get(getAllTasks).post(createTask);
router.route('/:id').get(getTask).patch(updateTask).delete(deleteTask);

module.exports = router;
