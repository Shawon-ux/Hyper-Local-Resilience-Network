const express = require('express');
const router = express.Router();
const { vouchForHelper, getUserReputation } = require('../controllers/reputationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/vouch/:taskId', vouchForHelper);
router.get('/user/:userId', getUserReputation);

module.exports = router;