const express = require("express");
const router = express.Router();

const {
  getAlerts,
  getAlertPrediction,
  getAlertStatusReport,
} = require("../controllers/alertController");

router.get("/", getAlerts);
router.get("/prediction", getAlertPrediction);
router.get("/status-report", getAlertStatusReport);

module.exports = router;