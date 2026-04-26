const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  createRequest,
  listRequests,
  getMyRequests,
  approveRequest,
  rejectRequest,
  claimRequest,
  fulfillRequest,
} = require('../controllers/criticalRequestController');

router.use(protect);

router.post('/', createRequest);
router.get('/', listRequests);
router.get('/my-requests', getMyRequests);
router.patch('/:id/approve', adminOnly, approveRequest);
router.patch('/:id/reject', adminOnly, rejectRequest);
router.patch('/:id/claim', claimRequest);
router.patch('/:id/fulfill', fulfillRequest);

module.exports = router;
