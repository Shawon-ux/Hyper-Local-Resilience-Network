const express = require('express');
const router = express.Router();
const { analyzeTask } = require('../controllers/microTaskController');

router.post('/analyze', analyzeTask);

module.exports = router;
