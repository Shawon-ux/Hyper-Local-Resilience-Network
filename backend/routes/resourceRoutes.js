const express = require("express");
const router = express.Router();
const {
  getResources,
  createResourceOffer,
  applyForResource,
  getPendingAdminApplications,
  getMyApplications,
  approveApplication,
  rejectApplication,
  deleteResourceOffer,
  getModeratorStats,
  getEmergencyStatus,
  toggleEmergencyMode,
} = require("../controllers/resourceController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", protect, getResources);
router.post("/", protect, createResourceOffer);
router.get("/my-applications", protect, getMyApplications);
router.get("/admin/pending-applications", protect, adminOnly, getPendingAdminApplications);
router.patch(
  "/:resourceId/applications/:applicationId/approve",
  protect,
  adminOnly,
  approveApplication
);
router.patch(
  "/:resourceId/applications/:applicationId/reject",
  protect,
  adminOnly,
  rejectApplication
);
router.post("/:id/apply", protect, applyForResource);
router.delete("/:id", protect, deleteResourceOffer);
router.get("/moderator-stats", protect, adminOnly, getModeratorStats);
router.get("/emergency/status", protect, getEmergencyStatus);
router.post("/emergency/toggle", protect, adminOnly, toggleEmergencyMode);

module.exports = router;
