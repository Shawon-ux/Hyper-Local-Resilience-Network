const express = require('express');
const router = express.Router();
const { updateSkills, getMyProfile } = require('../controllers/skillController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // requires authentication

router.put('/profile', updateSkills);
router.get('/my-profile', getMyProfile);

module.exports = router;