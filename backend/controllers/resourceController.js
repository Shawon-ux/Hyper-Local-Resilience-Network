const fs = require("fs");
const path = require("path");
const Resource = require("../models/Resource");
const ResourceOffer = require("../models/ResourceOffer");
const Emergency = require("../models/Emergency");
const User = require("../models/User");
const { createNotification } = require("../utils/notificationService");

const normalizeName = (value) => String(value || "").trim().toLowerCase();
const cleanDisplayName = (value) => String(value || "").trim();
const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseMaybeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const savePhotoIfPresent = ({ photoData, photoName }) => {
  if (!photoData || !String(photoData).startsWith("data:image/")) {
    return "";
  }

  const matches = String(photoData).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matches) return "";

  const mime = matches[1];
  const buffer = Buffer.from(matches[2], "base64");
  const extFromMime = mime.split("/")[1] || "png";
  const safeExt = extFromMime.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  const safeName = `${Date.now()}-${String(photoName || "resource").replace(
    /[^a-zA-Z0-9._-]/g,
    "-"
  )}.${safeExt}`;
  const uploadDir = path.join(__dirname, "..", "uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  fs.writeFileSync(path.join(uploadDir, safeName), buffer);
  return `/uploads/${safeName}`;
};

const syncAggregateResource = async (resourceName) => {
  const normalizedName = normalizeName(resourceName);
  if (!normalizedName) return null;

  const offers = await ResourceOffer.find({
    resourceName: new RegExp(`^${escapeRegex(normalizedName)}$`, "i"),
  }).sort({ updatedAt: -1 });

  if (!offers.length) {
    await Resource.deleteOne({ name: normalizedName });
    return null;
  }

  const latest = offers[0];
  const totalStock = offers.reduce((sum, offer) => sum + Number(offer.quantity || 0), 0);
  const remaining = offers.reduce(
    (sum, offer) => sum + Number(offer.remainingQuantity ?? offer.quantity ?? 0),
    0
  );
  const consumed = Math.max(0, totalStock - remaining);

  const resource = await Resource.findOneAndUpdate(
    { name: normalizedName },
    {
      name: normalizedName,
      unit: latest.unit || "items",
      totalStock,
      consumed,
      description: `Auto-synced from ${offers.length} community offer(s).`,
    },
    { new: true, upsert: true }
  );

  return resource;
};

const emitResourceSnapshot = async (req, eventName = "resourceUpdated") => {
  const io = req.app.get("io");
  const offers = await ResourceOffer.find()
    .populate("postedBy", "name email phone address isAdmin crisisAlertActive")
    .sort({ createdAt: -1 });

  io.emit(eventName, offers);
};

const formatApplicationForRequester = (offer, application) => ({
  resourceId: offer._id,
  resourceName: offer.resourceName,
  ownerName: offer.ownerName,
  community: offer.community,
  unit: offer.unit,
  requestedQuantity: application.requestedQuantity,
  approvedQuantity: application.approvedQuantity,
  applicantAddress: application.applicantAddress,
  status: application.status,
  reviewedAt: application.reviewedAt,
});

const getResources = async (req, res) => {
  try {
    const offers = await ResourceOffer.find()
      .populate("postedBy", "name email phone address isAdmin crisisAlertActive")
      .sort({ createdAt: -1 });

    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: "Failed to load resources." });
  }
};

const createResourceOffer = async (req, res) => {
  try {
    const {
      phone,
      community,
      areaName,
      resourceName,
      quantity,
      unit,
      availabilityStart,
      availabilityEnd,
      usageConstraints,
      latitude,
      longitude,
      photoData,
      photoName,
    } = req.body;

    if (!resourceName || !community || !areaName || !availabilityStart || !availabilityEnd) {
      return res.status(400).json({ message: "Missing required resource fields." });
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than zero." });
    }

    const photoUrl = savePhotoIfPresent({ photoData, photoName });
    const offer = await ResourceOffer.create({
      postedBy: req.user._id,
      ownerName: req.user.name,
      userName: req.user.name,
      phone: phone || req.user.phone,
      community,
      areaName,
      resourceName: cleanDisplayName(resourceName),
      quantity: parsedQuantity,
      remainingQuantity: parsedQuantity,
      unit: unit || "items",
      availabilityStart,
      availabilityEnd,
      usageConstraints: usageConstraints || "",
      photoUrl,
      latitude: parseMaybeNumber(latitude),
      longitude: parseMaybeNumber(longitude),
    });

    await syncAggregateResource(offer.resourceName);
    await emitResourceSnapshot(req, "resourceCreated");

    res.status(201).json(offer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create resource offer." });
  }
};

const applyForResource = async (req, res) => {
  try {
    const offer = await ResourceOffer.findById(req.params.id).populate("postedBy", "name");
    if (!offer) {
      return res.status(404).json({ message: "Resource offer not found." });
    }

    if (String(offer.postedBy?._id || offer.postedBy) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot apply to your own resource." });
    }

    const { requestedQuantity, applicantAddress, message } = req.body;
    const parsedQuantity = Number(requestedQuantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ message: "Requested quantity must be greater than zero." });
    }

    if (parsedQuantity > Number(offer.remainingQuantity)) {
      return res.status(400).json({ message: "Requested quantity exceeds remaining stock." });
    }

    const existingPending = offer.applications.find(
      (item) =>
        String(item.applicant) === String(req.user._id) && item.status === "Pending"
    );

    if (existingPending) {
      return res.status(400).json({ message: "You already have a pending request for this resource." });
    }

    offer.applications.push({
      applicant: req.user._id,
      applicantName: req.user.name,
      applicantPhone: req.user.phone,
      applicantAddress: applicantAddress || req.user.address,
      requestedQuantity: parsedQuantity,
      message: message || "",
    });

    await offer.save();
    await emitResourceSnapshot(req, "resourceUpdated");

    res.status(201).json({ success: true, message: "Application submitted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to apply for resource." });
  }
};

const getPendingAdminApplications = async (req, res) => {
  try {
    const offers = await ResourceOffer.find({
      "applications.status": "Pending",
    }).sort({ updatedAt: -1 });

    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: "Failed to load pending applications." });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const offers = await ResourceOffer.find({
      "applications.applicant": req.user._id,
    }).sort({ updatedAt: -1 });

    const flattened = offers.flatMap((offer) =>
      offer.applications
        .filter((application) => String(application.applicant) === String(req.user._id))
        .map((application) => formatApplicationForRequester(offer, application))
    );

    res.json(flattened);
  } catch (error) {
    res.status(500).json({ message: "Failed to load your applications." });
  }
};

const approveApplication = async (req, res) => {
  try {
    const { approvedQuantity } = req.body;
    const parsedApproved = Number(approvedQuantity);
    const offer = await ResourceOffer.findById(req.params.resourceId);

    if (!offer) {
      return res.status(404).json({ message: "Resource offer not found." });
    }

    const application = offer.applications.id(req.params.applicationId);
    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    if (application.status !== "Pending") {
      return res.status(400).json({ message: "This application has already been reviewed." });
    }

    if (!Number.isFinite(parsedApproved) || parsedApproved <= 0) {
      return res.status(400).json({ message: "Approved quantity must be greater than zero." });
    }

    const maxAllowed = Math.min(
      Number(application.requestedQuantity),
      Number(offer.remainingQuantity)
    );

    if (parsedApproved > maxAllowed) {
      return res.status(400).json({ message: "Approved quantity exceeds remaining stock." });
    }

    application.status = "Approved";
    application.approvedQuantity = parsedApproved;
    application.reviewedAt = new Date();
    application.reviewedBy = req.user._id;

    offer.remainingQuantity = Math.max(0, Number(offer.remainingQuantity) - parsedApproved);
    offer.status =
      offer.remainingQuantity === 0
        ? "Unavailable"
        : offer.remainingQuantity < offer.quantity
        ? "Reserved"
        : "Available";

    await offer.save();
    const aggregateResource = await syncAggregateResource(offer.resourceName);

    const io = req.app.get("io");
    await createNotification({
      io,
      user: application.applicant,
      type: "RESOURCE_APPROVED_FOR_APPLICANT",
      title: `${offer.resourceName} request approved`,
      message: `${parsedApproved} ${offer.unit} of ${offer.resourceName} has been approved for you.`,
      meta: {
        resourceId: offer._id,
        applicantId: application.applicant,
        resourceName: offer.resourceName,
        resourceCategory: offer.resourceName,
      },
    });

    await createNotification({
      io,
      user: offer.postedBy,
      type: "RESOURCE_APPROVED_FOR_SHARER",
      title: `Resource handoff approved`,
      message: `${application.applicantName} was approved to receive ${parsedApproved} ${offer.unit} of ${offer.resourceName}.`,
      meta: {
        resourceId: offer._id,
        applicantId: application.applicant,
        ownerId: offer.postedBy,
        resourceName: offer.resourceName,
        resourceCategory: offer.resourceName,
      },
    });

    if (
      aggregateResource &&
      Number(aggregateResource.totalStock) > 0 &&
      (aggregateResource.totalStock - aggregateResource.consumed) /
        aggregateResource.totalStock <=
        0.2
    ) {
      const admins = await User.find({ isAdmin: true }).select("_id");
      await Promise.all(
        admins.map((admin) =>
          createNotification({
            io,
            user: admin._id,
            type: "READINESS_GAP_ALERT",
            title: `${offer.resourceName} inventory is getting low`,
            message: `Approved sharing has reduced ${offer.resourceName} close to a low-stock threshold. Review the readiness dashboard and consider proactive outreach.`,
            meta: {
              resourceId: offer._id,
              resourceName: offer.resourceName,
              resourceCategory: offer.resourceName,
              outreachStatus: "AUTO_LOW_STOCK_AFTER_SHARING",
            },
          })
        )
      );
    }

    await emitResourceSnapshot(req, "requestApproved");
    res.json({ success: true, message: "Application approved." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to approve application." });
  }
};

const rejectApplication = async (req, res) => {
  try {
    const offer = await ResourceOffer.findById(req.params.resourceId);
    if (!offer) {
      return res.status(404).json({ message: "Resource offer not found." });
    }

    const application = offer.applications.id(req.params.applicationId);
    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    if (application.status !== "Pending") {
      return res.status(400).json({ message: "This application has already been reviewed." });
    }

    application.status = "Rejected";
    application.reviewedAt = new Date();
    application.reviewedBy = req.user._id;
    await offer.save();

    await createNotification({
      io: req.app.get("io"),
      user: application.applicant,
      type: "RESOURCE_REJECTED_FOR_APPLICANT",
      title: `${offer.resourceName} request rejected`,
      message: `Your request for ${offer.resourceName} could not be approved at this time.`,
      meta: {
        resourceId: offer._id,
        applicantId: application.applicant,
        resourceName: offer.resourceName,
        resourceCategory: offer.resourceName,
      },
    });

    await emitResourceSnapshot(req, "resourceUpdated");
    res.json({ success: true, message: "Application rejected." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to reject application." });
  }
};

const deleteResourceOffer = async (req, res) => {
  try {
    const offer = await ResourceOffer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Resource offer not found." });
    }

    const isOwner = String(offer.postedBy) === String(req.user._id);
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: "You do not have permission to delete this resource." });
    }

    await ResourceOffer.deleteOne({ _id: offer._id });
    await syncAggregateResource(offer.resourceName);
    await emitResourceSnapshot(req, "resourceDeleted");

    res.json({ success: true, message: "Resource deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete resource." });
  }
};

const getModeratorStats = async (req, res) => {
  try {
    const resources = await Resource.find().sort({ updatedAt: -1 });
    const stressPoints = resources.filter((resource) => {
      if (!resource.totalStock) return false;
      return (resource.totalStock - resource.consumed) / resource.totalStock <= 0.3;
    });
    const readyCount = resources.filter((resource) => {
      if (!resource.totalStock) return false;
      return (resource.totalStock - resource.consumed) / resource.totalStock > 0.5;
    }).length;

    res.json({
      readinessScore: Math.round(resources.length ? (readyCount / resources.length) * 100 : 0),
      stressPoints,
      totalResources: resources.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load moderator stats." });
  }
};

const getEmergencyStatus = async (req, res) => {
  try {
    const status = await Emergency.findOne().sort({ updatedAt: -1 });
    res.json(
      status || {
        isActive: false,
        type: "None",
        area: "",
        severity: "Low",
        message: "",
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Failed to load emergency status." });
  }
};

const toggleEmergencyMode = async (req, res) => {
  try {
    const { isActive, type, area, severity, message } = req.body;
    const status = await Emergency.findOneAndUpdate(
      {},
      {
        isActive: Boolean(isActive),
        type: type || "None",
        area: area || "Unknown",
        severity: severity || "Medium",
        message: message || "",
        updatedAt: Date.now(),
      },
      { upsert: true, new: true }
    );

    req.app.get("io").emit("EMERGENCY_STATUS_CHANGE", status);
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({ message: "Failed to update emergency mode." });
  }
};

module.exports = {
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
};
