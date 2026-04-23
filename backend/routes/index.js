const express = require('express');
const router = express.Router();

// Import individual controllers
const readinessController = require('../controllers/readinessController');

/**
 * @route   GET /api/readiness
 * @desc    Get dynamic gap analysis between supply and demand
 * @access  Private/Admin
 */
router.get('/readiness', readinessController.getReadinessData);

// You can add more routes here as your app grows
// router.use('/resources', require('./resourceRoutes'));
// router.use('/alerts', require('./alertRoutes'));

module.exports = router;