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
  fs.writeFileSync(filePath, Buffer.from(matches[2], "base64"));
  return `/uploads/${filename}`;
};

router.post("/", protect, async (req, res) => {
  try {
    let photoUrl = "";
    if (req.body.photoData && req.body.photoName) {
      photoUrl = createPhotoFile(req.body.photoData, req.body.photoName);
    }

    const quantity = Number(req.body.quantity);

    const payload = {
      postedBy: req.user._id,
      ownerName: req.user.name,
      userName: req.user.name,
      phone: req.body.phone || req.user.phone,
      community: req.body.community,
      resourceName: req.body.resourceName,
      quantity,
      remainingQuantity: quantity,
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
      .populate("applications.applicant", "name email phone")
      .populate("applications.reviewedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch resource offers",
      error: error.message,
    });
  }
});

// NEW: logged-in user can see only their own requests
router.get("/my-applications", protect, async (req, res) => {
  try {
    const offers = await ResourceOffer.find({
      "applications.applicant": req.user._id,
    })
      .populate("postedBy", "name email phone isAdmin")
      .populate("applications.applicant", "name email phone")
      .populate("applications.reviewedBy", "name email")
      .sort({ createdAt: -1 });

    const myRequests = [];

    offers.forEach((offer) => {
      offer.applications.forEach((app) => {
        const applicantId =
          typeof app.applicant === "object" ? app.applicant?._id?.toString() : app.applicant?.toString();

        if (applicantId === req.user._id.toString()) {
          myRequests.push({
            resourceId: offer._id,
            resourceName: offer.resourceName,
            community: offer.community,
            unit: offer.unit,
            ownerName: offer.ownerName,
            status: app.status,
            requestedQuantity: app.requestedQuantity,
            approvedQuantity: app.approvedQuantity || 0,
            applicantAddress: app.applicantAddress,
            message: app.message || "",
            appliedAt: app.appliedAt,
            reviewedAt: app.reviewedAt,
            remainingQuantity: offer.remainingQuantity,
          });
        }
      });
    });

    res.status(200).json(myRequests);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch your applications",
      error: error.message,
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

    if (offer.status !== "Available" || offer.remainingQuantity <= 0) {
      return res.status(400).json({ message: "This resource is not available right now" });
    }

    const requestedQuantity = Number(req.body.requestedQuantity);
    const applicantAddress = String(req.body.applicantAddress || "").trim();

    if (!Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
      return res.status(400).json({ message: "Requested quantity must be at least 1" });
    }

    if (requestedQuantity > offer.remainingQuantity) {
      return res.status(400).json({
        message: `Only ${offer.remainingQuantity} ${offer.unit} available now`,
      });
    }

    if (!applicantAddress) {
      return res.status(400).json({ message: "Applicant address is required" });
    }

    offer.applications.push({
      applicant: req.user._id,
      applicantName: req.user.name,
      applicantPhone: req.user.phone || "",
      applicantAddress,
      requestedQuantity,
      message: req.body.message || "",
      status: "Pending",
    });

    await offer.save();

    const updated = await ResourceOffer.findById(offer._id)
      .populate("postedBy", "name email phone isAdmin")
      .populate("applications.applicant", "name email phone")
      .populate("applications.reviewedBy", "name email");

    req.app.get("io").emit("resourceUpdated", updated);

    res.status(200).json({
      message: "Application sent to admin successfully",
      offer: updated,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to apply for resource",
      error: error.message,
    });
  }
});

router.get("/admin/pending-applications", protect, adminOnly, async (req, res) => {
  try {
    const offers = await ResourceOffer.find({
      "applications.status": "Pending",
    })
      .populate("postedBy", "name email phone isAdmin")
      .populate("applications.applicant", "name email phone")
      .populate("applications.reviewedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch pending applications",
      error: error.message,
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

    const approveQuantity = Number(req.body.approvedQuantity || application.requestedQuantity);

    if (!Number.isFinite(approveQuantity) || approveQuantity < 1) {
      return res.status(400).json({ message: "Approved quantity must be at least 1" });
    }

    if (approveQuantity > application.requestedQuantity) {
      return res.status(400).json({
        message: "Approved quantity cannot be greater than requested quantity",
      });
    }

    if (approveQuantity > offer.remainingQuantity) {
      return res.status(400).json({
        message: `Only ${offer.remainingQuantity} ${offer.unit} remaining`,
      });
    }

    application.status = "Approved";
    application.approvedQuantity = approveQuantity;
    application.reviewedAt = new Date();
    application.reviewedBy = req.user._id;

    offer.remainingQuantity -= approveQuantity;
    offer.status = offer.remainingQuantity > 0 ? "Available" : "Reserved";

    await offer.save();

    const updated = await ResourceOffer.findById(offer._id)
      .populate("postedBy", "name email phone isAdmin")
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
      error: error.message,
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
      error: error.message,
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
      error: error.message,
    });
  }
});

module.exports = router;