const express = require('express');
const router = express.Router();
const { getAlerts, getAlertPrediction } = require('../controllers/alertController');

router.get('/', getAlerts);
router.get('/prediction', getAlertPrediction);

module.exports = router;
