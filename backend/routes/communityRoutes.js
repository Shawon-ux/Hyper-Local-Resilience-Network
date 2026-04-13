const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createCommunity,
  getMyCommunities,
  searchCommunities,
  requestToJoin,
  acceptJoinRequest,
  declineJoinRequest,
  getCommunityStatus,
} = require('../controllers/communityController');
const { createCommunityValidator } = require('../middleware/validators/communityValidator');

router.use(protect);

router.get('/mine', getMyCommunities);
router.get('/', searchCommunities);
router.get('/:communityId/status', getCommunityStatus);
router.post('/', createCommunityValidator, createCommunity);
router.post('/:communityId/join-request', requestToJoin);
router.post('/:communityId/requests/:userId/accept', acceptJoinRequest);
router.post('/:communityId/requests/:userId/decline', declineJoinRequest);

module.exports = router;
