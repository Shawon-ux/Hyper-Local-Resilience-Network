const express = require('express');
const router = express.Router();
const {
  vouchForHelper,
  getUserReputation,
  createVouch,
  getReputationLeaderboard,
  verifyVouch,
  getTransactions,
  getUserVouches,
} = require('../controllers/reputationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Vouch endpoints
router.post('/vouch', createVouch); // Create new vouch
router.get('/vouch/:vouchID/verify', verifyVouch); // Admin verify vouch (legacy)
router.patch('/vouch/:vouchID/verify', verifyVouch); // Admin verify vouch
router.post('/vouch/:taskId', vouchForHelper); // Legacy endpoint

// Reputation endpoints
router.get('/leaderboard', getReputationLeaderboard);
router.get('/:userID', getUserReputation); // Get user reputation details
router.get('/user/:userId', getUserReputation); // Legacy endpoint
router.get('/vouches/:userID', getUserVouches); // Get all vouches for user

// Transaction/Audit endpoints
router.get('/transactions/:userID', getTransactions); // Get transaction history

module.exports = router;