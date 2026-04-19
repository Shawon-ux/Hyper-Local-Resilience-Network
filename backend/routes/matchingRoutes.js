const express = require('express');
const router = express.Router();
const {
  matchVolunteersForTask,
  matchOffersForRequest,
  matchOffersForMyRequests,
} = require('../controllers/matchingController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/microtask/:taskId', matchVolunteersForTask);
router.get('/request/:requestId/offers', matchOffersForRequest);
router.get('/my-requests', matchOffersForMyRequests);

module.exports = router;