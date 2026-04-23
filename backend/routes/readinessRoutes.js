const express = require("express");
const router = express.Router();
const { getReadinessData } = require("../controllers/readinessController");

// Define the GET route
router.get("/", getReadinessData);

module.exports = router;