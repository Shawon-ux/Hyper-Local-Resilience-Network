const express = require("express");
const router = express.Router();

const {
  getAlerts,
  getAlertPrediction,
  getAlertStatusReport,
  getCommunityAlerts,
  createCommunityAlert,
  updateCommunityAlert,
  deleteCommunityAlert,
} = require("../controllers/alertController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", getAlerts);
router.get("/prediction", getAlertPrediction);
router.get("/status-report", getAlertStatusReport);
router.get("/community", protect, adminOnly, getCommunityAlerts);
router.post("/community", protect, adminOnly, createCommunityAlert);
router.patch("/community/:id", protect, adminOnly, updateCommunityAlert);
router.delete("/community/:id", protect, adminOnly, deleteCommunityAlert);

module.exports = router;
