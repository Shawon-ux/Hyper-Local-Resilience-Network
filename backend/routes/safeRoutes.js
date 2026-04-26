const express = require("express");
const router = express.Router();
const SafeReport = require("../models/SafeReport");
const { protect } = require("../middleware/authMiddleware");

// 0. Meta route for frontend emergency-state check
router.get("/meta", protect, async (req, res) => {
  try {
    res.status(200).json({
      emergencyActive: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch safe status metadata",
      error: error.message,
    });
  }
});

// 1. User marks self as safe or unsafe
router.post("/", protect, async (req, res) => {
  try {
    const { community, status, latitude, longitude, note } = req.body;

    const report = new SafeReport({
      userName: req.user.name,
      phone: req.user.phone || "N/A",
      community,
      status,
      latitude,
      longitude,
      note: note || "",
      emergencyDeclared: true,
      validated: false,
    });

    const savedReport = await report.save();

    const io = req.app.get("io");
    io.emit("safeStatusCreated", savedReport);

    res.status(201).json(savedReport);
  } catch (error) {
    res.status(400).json({
      message: "Failed to create safe status report",
      error: error.message,
    });
  }
});

// 2. Get all safe/unsafe reports for map
router.get("/", protect, async (req, res) => {
  try {
    const reports = await SafeReport.find().sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch safe status reports",
      error: error.message,
    });
  }
});

// 3. Update validation status
router.patch("/:id/validate", protect, async (req, res) => {
  try {
    const { validated } = req.body;

    const updatedReport = await SafeReport.findByIdAndUpdate(
      req.params.id,
      { validated },
      { new: true, runValidators: true }
    );

    if (!updatedReport) {
      return res.status(404).json({ message: "Safe report not found" });
    }

    const io = req.app.get("io");
    io.emit("safeStatusUpdated", updatedReport);

    res.status(200).json(updatedReport);
  } catch (error) {
    res.status(400).json({
      message: "Failed to update validation status",
      error: error.message,
    });
  }
});

// 4. Delete safe/unsafe report
router.delete("/:id", protect, async (req, res) => {
  try {
    const deletedReport = await SafeReport.findByIdAndDelete(req.params.id);

    if (!deletedReport) {
      return res.status(404).json({ message: "Safe report not found" });
    }

    const io = req.app.get("io");
    io.emit("safeStatusDeleted", { id: req.params.id });

    res.status(200).json({ message: "Safe report deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete safe report",
      error: error.message,
    });
  }
});

module.exports = router;