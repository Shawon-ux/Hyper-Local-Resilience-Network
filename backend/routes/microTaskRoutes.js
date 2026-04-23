const express = require('express');
const router = express.Router();
const {
  createMicroTask,
  getMyTasks,
  updateMicroTask,
  deleteMicroTask,
  acceptTask,
  getAvailableTasks,
  completeTask,
} = require('../controllers/microTaskController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createMicroTask);
router.get('/my-tasks', getMyTasks);
router.get('/available', getAvailableTasks);
router.patch('/:id', updateMicroTask);
router.delete('/:id', deleteMicroTask);
router.post('/:id/accept', acceptTask);
router.post('/:id/complete', completeTask);

module.exports = router;