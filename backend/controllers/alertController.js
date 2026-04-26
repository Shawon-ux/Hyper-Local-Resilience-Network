const {
  buildAlertPredictionSnapshot,
} = require("../utils/resourceForecast");
const Emergency = require("../models/Emergency");
const CommunityAlert = require("../models/CommunityAlert");

const fetchAlerts = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://api.weather.gov/alerts/active?point=${lat},${lng}`,
      {
        headers: {
          "User-Agent":
            "Hyper-Local-Resilience-Network/1.0 (contact@example.com)",
        },
      }
    );

    const data = await response.json();

    return (data.features || []).map((feature) => ({
      id: feature.properties.id,
      title: feature.properties.headline || feature.properties.event,
      description: feature.properties.description,
      severity: feature.properties.severity,
      urgency: feature.properties.urgency,
      areas: feature.properties.areaDesc,
      effective: feature.properties.effective,
      expires: feature.properties.expires,
      status: feature.properties.status,
    }));
  } catch (error) {
    console.error("Error fetching alerts:", error.message);
    return [];
  }
};

const createMockAlerts = () => [
  {
    id: "mock-1",
    title: "Severe Thunderstorm Warning",
    description:
      "A severe thunderstorm capable of damaging winds is approaching.",
    severity: "Severe",
    urgency: "Immediate",
    status: "Actual",
    effective: new Date().toISOString(),
    expires: new Date(Date.now() + 3600000).toISOString(),
  },
  {
    id: "mock-2",
    title: "Flood Watch",
    description: "Heavy rainfall may cause flooding in low-lying areas.",
    severity: "Moderate",
    urgency: "Expected",
    status: "Actual",
    effective: new Date().toISOString(),
    expires: new Date(Date.now() + 7200000).toISOString(),
  },
];

const mapEmergencyToAlert = (emergency) => {
  if (!emergency?.isActive) return null;

  const severityMap = {
    Low: "Minor",
    Medium: "Moderate",
    High: "Severe",
    Critical: "Extreme",
  };

  return {
    id: `emergency-${emergency._id || "active"}`,
    title: `${emergency.type || "Emergency"} Alert`,
    description:
      emergency.message ||
      `${emergency.type || "Emergency"} conditions reported for ${emergency.area || "the selected area"}.`,
    severity: severityMap[emergency.severity] || "Severe",
    urgency: emergency.isActive ? "Immediate" : "Expected",
    areas: emergency.area || "Selected area",
    effective: emergency.updatedAt || new Date().toISOString(),
    expires: null,
    status: "Actual",
    source: "admin",
  };
};

const mapCommunityAlert = (alert) => ({
  id: `community-${alert._id}`,
  title: alert.title,
  description: alert.description,
  severity: alert.severity,
  urgency: alert.urgency,
  areas: alert.area || "Selected area",
  effective: alert.updatedAt || alert.createdAt || new Date().toISOString(),
  expires: null,
  status: alert.isActive ? "Actual" : "Inactive",
  source: "community",
});

const areaMatches = (filterArea, alertArea) => {
  const normalizedFilter = String(filterArea || "").trim().toLowerCase();
  const normalizedAlert = String(alertArea || "").trim().toLowerCase();

  if (!normalizedFilter) return true;
  if (!normalizedAlert) return true;

  return (
    normalizedAlert.includes(normalizedFilter) ||
    normalizedFilter.includes(normalizedAlert)
  );
};

const loadAlerts = async (lat, lng, areaName = "") => {
  const [publicAlerts, emergency, communityAlerts] = await Promise.all([
    fetchAlerts(lat, lng),
    Emergency.findOne().sort({ updatedAt: -1 }).lean(),
    CommunityAlert.find({ isActive: true }).sort({ updatedAt: -1 }).lean(),
  ]);

  const adminAlert = mapEmergencyToAlert(emergency);
  const filteredCommunityAlerts = communityAlerts
    .filter((alert) => areaMatches(areaName, alert.area))
    .map(mapCommunityAlert);
  const shouldIncludeEmergency =
    adminAlert &&
    areaMatches(areaName, adminAlert.areas);

  const mergedAlerts = [
    ...(shouldIncludeEmergency ? [adminAlert] : []),
    ...filteredCommunityAlerts,
    ...publicAlerts,
  ];

  return mergedAlerts.length ? mergedAlerts : createMockAlerts();
};

const getCommunityAlerts = async (req, res) => {
  try {
    const alerts = await CommunityAlert.find().sort({ updatedAt: -1 });
    res.json({ alerts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load community alerts." });
  }
};

const createCommunityAlert = async (req, res) => {
  try {
    const { title, type, severity, urgency, area, description, isActive } = req.body;
    const alert = await CommunityAlert.create({
      title,
      type,
      severity,
      urgency,
      area,
      description,
      isActive: isActive !== false,
      createdBy: req.user?._id || null,
    });

    req.app.get("io").emit("ALERTS_UPDATED", { type: "created", alert });
    res.status(201).json({ alert });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create community alert." });
  }
};

const updateCommunityAlert = async (req, res) => {
  try {
    const alert = await CommunityAlert.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!alert) {
      return res.status(404).json({ message: "Community alert not found." });
    }

    req.app.get("io").emit("ALERTS_UPDATED", { type: "updated", alert });
    res.json({ alert });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update community alert." });
  }
};

const deleteCommunityAlert = async (req, res) => {
  try {
    const alert = await CommunityAlert.findByIdAndDelete(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: "Community alert not found." });
    }

    req.app.get("io").emit("ALERTS_UPDATED", { type: "deleted", alertId: req.params.id });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete community alert." });
  }
};

const getAlerts = async (req, res) => {
  try {
    const { lat, lng, areaName } = req.query;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude required" });
    }

    const alerts = await loadAlerts(lat, lng, areaName);

    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch alerts" });
  }
};

const getAlertPrediction = async (req, res) => {
  try {
    const { lat, lng, areaName } = req.query;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude required" });
    }

    const alerts = await loadAlerts(lat, lng, areaName);
    const prediction = await buildAlertPredictionSnapshot({
      alerts,
      latitude: Number(lat),
      longitude: Number(lng),
      areaName,
    });

    res.json({ prediction, alerts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Prediction failed" });
  }
};

const getAlertStatusReport = async (req, res) => {
  try {
    const { lat, lng, areaName } = req.query;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude required" });
    }

    const alerts = await loadAlerts(lat, lng, areaName);
    const prediction = await buildAlertPredictionSnapshot({
      alerts,
      latitude: Number(lat),
      longitude: Number(lng),
      areaName,
    });

    res.json({
      alerts,
      readiness: prediction.readiness,
      predictionSummary: {
        confidence: prediction.confidence,
        summary: prediction.summary,
        next6HoursMessages: prediction.next6HoursMessages,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Status report failed" });
  }
};

module.exports = {
  getAlerts,
  getAlertPrediction,
  getAlertStatusReport,
  loadAlerts,
  getCommunityAlerts,
  createCommunityAlert,
  updateCommunityAlert,
  deleteCommunityAlert,
};
