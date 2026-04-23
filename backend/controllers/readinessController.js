const {
  buildReadinessAnalysis,
  findRelevantProviders,
  notifyProvidersForPredictedNeed,
} = require("../utils/resourceForecast");
const { loadAlerts } = require("./alertController");
const User = require("../models/User");

const getReadinessData = async (req, res) => {
  try {
    const { lat, lng, areaName } = req.query;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude required" });
    }

    const alerts = await loadAlerts(lat, lng);
    const readiness = await buildReadinessAnalysis({
      alerts,
      latitude: Number(lat),
      longitude: Number(lng),
      areaName,
    });

    const proactiveTargets = await Promise.all(
      readiness.analysis
        .filter((item) => item.severity !== "Stable" && item.gap > 0)
        .map(async (item) => {
          const providers = await findRelevantProviders({
            category: item.category,
            latitude: Number(lat),
            longitude: Number(lng),
            areaName,
          });

          return {
            category: item.category,
            gap: item.gap,
            providerCount: providers.length,
            providers: providers.map((provider) => ({
              userId: provider.user._id,
              name: provider.user.name,
              phone: provider.user.phone,
              totalAvailable: provider.totalAvailable,
              matchedOffers: provider.offers.map((offer) => ({
                id: offer._id,
                resourceName: offer.resourceName,
                remainingQuantity: offer.remainingQuantity,
                areaName: offer.areaName,
              })),
            })),
          };
        })
    );

    res.json({
      success: true,
      analysis: readiness.analysis,
      summary: readiness.summary,
      proactiveTargets,
      alerts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to calculate readiness." });
  }
};

const triggerProactiveOutreach = async (req, res) => {
  try {
    const { lat, lng, areaName, category } = req.body;

    if (!lat || !lng || !category) {
      return res.status(400).json({
        message: "Latitude, longitude, and category are required.",
      });
    }

    const alerts = await loadAlerts(lat, lng);
    const readiness = await buildReadinessAnalysis({
      alerts,
      latitude: Number(lat),
      longitude: Number(lng),
      areaName,
    });

    const target = readiness.analysis.find(
      (item) => item.category === String(category).toLowerCase()
    );

    if (!target) {
      return res.status(404).json({ message: "No readiness category found." });
    }

    const outreach = await notifyProvidersForPredictedNeed({
      category: target.category,
      gap: target.gap,
      alerts,
      latitude: Number(lat),
      longitude: Number(lng),
      areaName,
      triggeredBy: req.user?._id || null,
    });

    res.json({
      success: true,
      message: `Sent proactive outreach to ${outreach.providers.length} community member(s).`,
      category: target.category,
      gap: target.gap,
      providers: outreach.providers,
      notificationsCreated: outreach.notifications.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to trigger proactive outreach." });
  }
};

const getAlertUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("name email phone address isAdmin crisisAlertActive updatedAt")
      .sort({ isAdmin: -1, name: 1 });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load alert users." });
  }
};

const updateAlertUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { crisisAlertActive: Boolean(isActive) },
      { new: true }
    ).select("name email phone address isAdmin crisisAlertActive updatedAt");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({
      success: true,
      message: `${updatedUser.name}'s proactive alerts are now ${
        updatedUser.crisisAlertActive ? "active" : "paused"
      }.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update alert user status." });
  }
};

module.exports = {
  getReadinessData,
  triggerProactiveOutreach,
  getAlertUsers,
  updateAlertUserStatus,
};
