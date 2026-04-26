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
  toggleEmergencyMode,
  getCommunityDetails,
  getCommunityPosts,
  createPost,
  updatePostStatus,
  deletePost,
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
router.post('/:communityId/emergency-mode', toggleEmergencyMode);
router.get('/:communityId', getCommunityDetails);
router.get('/:communityId/posts', getCommunityPosts);
router.post('/:communityId/posts', createPost);
router.delete('/:communityId/posts/:postId', deletePost);
router.patch('/:communityId/posts/:postId/status', updatePostStatus);

module.exports = router;
