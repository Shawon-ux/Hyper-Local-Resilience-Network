const express = require("express");
const router = express.Router();
const {
  getReadinessData,
  triggerProactiveOutreach,
  getAlertUsers,
  updateAlertUserStatus,
} = require("../controllers/readinessController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", protect, getReadinessData);
router.post("/outreach", protect, adminOnly, triggerProactiveOutreach);
router.get("/alert-users", protect, adminOnly, getAlertUsers);
router.patch("/alert-users/:userId", protect, adminOnly, updateAlertUserStatus);

module.exports = router;
