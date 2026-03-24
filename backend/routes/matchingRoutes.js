const express = require('express');
const router = express.Router();
const { matchVolunteersForTask } = require('../controllers/matchingController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/microtask/:taskId', matchVolunteersForTask);

module.exports = router;