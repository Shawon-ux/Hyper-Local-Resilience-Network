const express = require('express');
const router = express.Router();
const { createMicroTask, getMyTasks } = require('../controllers/microTaskController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createMicroTask);
router.get('/my-tasks', getMyTasks);

module.exports = router;