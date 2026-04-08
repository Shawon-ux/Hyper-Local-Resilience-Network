const express = require('express');
const router = express.Router();
const { getAlerts } = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getAlerts);

module.exports = router;