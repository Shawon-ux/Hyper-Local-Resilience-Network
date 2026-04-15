const express = require('express');
const router = express.Router();
const { updateSkills, getMyProfile, bulkUpdateSkills } = require('../controllers/skillController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // requires authentication

router.put('/profile', updateSkills);
router.put('/batch', bulkUpdateSkills);
router.get('/my-profile', getMyProfile);

module.exports = router;