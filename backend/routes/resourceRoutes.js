const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const ResourceOffer = require("../models/ResourceOffer");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const createPhotoFile = (photoData, photoName) => {
  const matches = photoData.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!matches) return null;
  const extension = path.extname(photoName) || `.${matches[1].split('/')[1]}`;
  const filename = `${Date.now()}-${path.basename(photoName, extension)}${extension}`;
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
  return `/uploads/${filename}`;
};

router.post("/", protect, async (req, res) => {
  try {
    let photoUrl = "";
    if (req.body.photoData && req.body.photoName) {
      photoUrl = createPhotoFile(req.body.photoData, req.body.photoName);
    }

    const payload = {
      postedBy: req.user._id,
      ownerName: req.user.name,
      userName: req.user.name,
      phone: req.body.phone || req.user.phone,
      community: req.body.community,
      resourceName: req.body.resourceName,
      quantity: Number(req.body.quantity),
      unit: req.body.unit || "items",
      availabilityStart: req.body.availabilityStart,
      availabilityEnd: req.body.availabilityEnd,
      usageConstraints: req.body.usageConstraints || "",
      latitude: Number(req.body.latitude),
      longitude: Number(req.body.longitude),
      photoUrl,
      status: "Available",
      applications: [],
    };

    const offer = new ResourceOffer(payload);
    const savedOffer = await offer.save();

    const populated = await ResourceOffer.findById(savedOffer._id)
      .populate("postedBy", "name email phone isAdmin")
      .populate("assignedTo", "name email phone")
      .populate("applications.applicant", "name email phone")
      .populate("applications.reviewedBy", "name email");

    req.app.get("io").emit("resourceCreated", populated);

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({
      message: "Failed to create resource offer",
      error: error.message,
    });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const offers = await ResourceOffer.find()
      .populate("postedBy", "name email phone isAdmin")
      .populate("assignedTo", "name email phone")
      .populate("applications.applicant", "name email phone")
      .populate("applications.reviewedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch resource offers",
      error: error.message
    });
  }
});

router.post("/:id/apply", protect, async (req, res) => {
  try {
    const offer = await ResourceOffer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ message: "Resource offer not found" });
    }

    if (offer.postedBy.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: "You cannot apply to your own resource" });
    }

    if (offer.status !== "Available") {
      return res.status(400).json({ message: "This resource is not available for application" });
    }

    const existing = offer.applications.find(
      (app) => app.applicant.toString() === req.user._id.toString()
    );

    if (existing) {
      return res.status(400).json({ message: "You already applied for this resource" });
    }

    offer.applications.push({
      applicant: req.user._id,
      applicantName: req.user.name,
      applicantPhone: req.user.phone || "",
      message: req.body.message || "",
      status: "Pending",
    });

    await offer.save();

    const updated = await ResourceOffer.findById(offer._id)
      .populate("postedBy", "name email phone isAdmin")
      .populate("assignedTo", "name email phone")
      .populate("applications.applicant", "name email phone")
      .populate("applications.reviewedBy", "name email");

    req.app.get("io").emit("resourceApplicationCreated", {
      resourceId: updated._id,
      resourceName: updated.resourceName,
    });
    req.app.get("io").emit("resourceUpdated", updated);

    res.status(200).json({
      message: "Application submitted successfully and sent to admin for review",
      offer: updated,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to apply for resource",
      error: error.message
    });
  }
});

router.get("/admin/pending-applications", protect, adminOnly, async (req, res) => {
  try {
    const offers = await ResourceOffer.find({
      "applications.status": "Pending",
    })
      .populate("postedBy", "name email phone isAdmin")
      .populate("assignedTo", "name email phone")
      .populate("applications.applicant", "name email phone")
      .populate("applications.reviewedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch pending applications",
      error: error.message
    });
  }
});

router.patch("/:resourceId/applications/:applicationId/approve", protect, adminOnly, async (req, res) => {
  try {
    const offer = await ResourceOffer.findById(req.params.resourceId);
    if (!offer) {
      return res.status(404).json({ message: "Resource offer not found" });
    }

    const application = offer.applications.id(req.params.applicationId);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.status !== "Pending") {
      return res.status(400).json({ message: "Only pending applications can be approved" });
    }

    application.status = "Approved";
    application.reviewedAt = new Date();
    application.reviewedBy = req.user._id;

    offer.status = "Reserved";
    offer.assignedTo = application.applicant;
    offer.assignedApplicantName = application.applicantName;

    offer.applications.forEach((app) => {
      if (app._id.toString() !== application._id.toString() && app.status === "Pending") {
        app.status = "Rejected";
        app.reviewedAt = new Date();
        app.reviewedBy = req.user._id;
      }
    });

    await offer.save();

    const updated = await ResourceOffer.findById(offer._id)
      .populate("postedBy", "name email phone isAdmin")
      .populate("assignedTo", "name email phone")
      .populate("applications.applicant", "name email phone")
      .populate("applications.reviewedBy", "name email");

    req.app.get("io").emit("resourceUpdated", updated);

    res.status(200).json({
      message: "Application approved successfully",
      offer: updated,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to approve application",
      error: error.message
    });
  }
});

router.patch("/:resourceId/applications/:applicationId/reject", protect, adminOnly, async (req, res) => {
  try {
    const offer = await ResourceOffer.findById(req.params.resourceId);
    if (!offer) {
      return res.status(404).json({ message: "Resource offer not found" });
    }

    const application = offer.applications.id(req.params.applicationId);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.status !== "Pending") {
      return res.status(400).json({ message: "Only pending applications can be rejected" });
    }

    application.status = "Rejected";
    application.reviewedAt = new Date();
    application.reviewedBy = req.user._id;

    await offer.save();

    const updated = await ResourceOffer.findById(offer._id)
      .populate("postedBy", "name email phone isAdmin")
      .populate("assignedTo", "name email phone")
      .populate("applications.applicant", "name email phone")
      .populate("applications.reviewedBy", "name email");

    req.app.get("io").emit("resourceUpdated", updated);

    res.status(200).json({
      message: "Application rejected successfully",
      offer: updated,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to reject application",
      error: error.message
    });
  }
});

router.patch("/:id/status", protect, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["Available", "Reserved", "Unavailable"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const offer = await ResourceOffer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Resource offer not found" });
    }

    const isOwner = offer.postedBy.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: "Only the owner or admin can update this resource" });
    }

    offer.status = status;

    if (status === "Available") {
      offer.assignedTo = null;
      offer.assignedApplicantName = "";
    }

    await offer.save();

    const updated = await ResourceOffer.findById(offer._id)
      .populate("postedBy", "name email phone isAdmin")
      .populate("assignedTo", "name email phone")
      .populate("applications.applicant", "name email phone")
      .populate("applications.reviewedBy", "name email");

    req.app.get("io").emit("resourceUpdated", updated);

    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({
      message: "Failed to update resource status",
      error: error.message
    });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const offer = await ResourceOffer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ message: "Resource offer not found" });
    }

    if (offer.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can delete only your own posted resources" });
    }

    await ResourceOffer.findByIdAndDelete(req.params.id);

    req.app.get("io").emit("resourceDeleted", { id: req.params.id });

    res.status(200).json({ message: "Resource offer deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete resource offer",
      error: error.message
    });
  }
});

module.exports = router;