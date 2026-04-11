const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const ResourceOffer = require("../models/ResourceOffer");

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

// 1. Create resource offer
router.post("/", async (req, res) => {
  try {
    let photoUrl = "";
    if (req.body.photoData && req.body.photoName) {
      photoUrl = createPhotoFile(req.body.photoData, req.body.photoName);
    }

    const payload = {
      userName: req.body.userName,
      phone: req.body.phone,
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
    };

    const offer = new ResourceOffer(payload);
    const savedOffer = await offer.save();

    const io = req.app.get("io");
    io.emit("resourceCreated", savedOffer);

    res.status(201).json(savedOffer);
  } catch (error) {
    res.status(400).json({
      message: "Failed to create resource offer",
      error: error.message,
    });
  }
});

// 2. Get all resource offers
router.get("/", async (req, res) => {
  try {
    const offers = await ResourceOffer.find().sort({ createdAt: -1 });
    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch resource offers",
      error: error.message
    });
  }
});

// 3. Update resource status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ["Available", "Reserved", "Unavailable"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const updatedOffer = await ResourceOffer.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedOffer) {
      return res.status(404).json({ message: "Resource offer not found" });
    }

    const io = req.app.get("io");
    io.emit("resourceUpdated", updatedOffer);

    res.status(200).json(updatedOffer);
  } catch (error) {
    res.status(400).json({
      message: "Failed to update resource status",
      error: error.message
    });
  }
});

// 4. Delete resource offer
router.delete("/:id", async (req, res) => {
  try {
    const deletedOffer = await ResourceOffer.findByIdAndDelete(req.params.id);

    if (!deletedOffer) {
      return res.status(404).json({ message: "Resource offer not found" });
    }

    const io = req.app.get("io");
    io.emit("resourceDeleted", { id: req.params.id });

    res.status(200).json({ message: "Resource offer deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete resource offer",
      error: error.message
    });
  }
});

module.exports = router;