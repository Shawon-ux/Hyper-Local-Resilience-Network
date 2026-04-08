const express = require('express');
const router = express.Router();
const { getAlerts, getAlertPrediction } = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getAlerts);
router.get('/prediction', protect, getAlertPrediction);

module.exports = router;
