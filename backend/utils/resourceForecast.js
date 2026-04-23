const Resource = require("../models/Resource");
const ResourceOffer = require("../models/ResourceOffer");
const { createNotification } = require("./notificationService");

const CATEGORY_CONFIG = {
  water: {
    keywords: ["water", "pump", "drinking water"],
    recommendedOfferTerms: ["pump", "water", "drinking water"],
  },
  fuel: {
    keywords: ["fuel", "gas", "diesel", "generator"],
    recommendedOfferTerms: ["fuel", "generator", "diesel"],
  },
  shelter: {
    keywords: ["shelter", "tent", "blanket", "tarpaulin"],
    recommendedOfferTerms: ["shelter", "tent", "blanket"],
  },
  medical: {
    keywords: ["medical", "medicine", "bandage", "first aid", "aid kit"],
    recommendedOfferTerms: ["medical", "medicine", "first aid"],
  },
  food: {
    keywords: ["food", "meal", "rice", "dry food"],
    recommendedOfferTerms: ["food", "meal", "rice"],
  },
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const textMatches = (value, words = []) =>
  words.some((word) => normalizeText(value).includes(word));

const createBlankResourceMap = () =>
  Object.keys(CATEGORY_CONFIG).reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

const roundTo = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
};

const addCategoryValue = (target, resourceName, value) => {
  const text = normalizeText(resourceName);
  const numericValue = Number(value || 0);
  if (!numericValue) return;

  Object.entries(CATEGORY_CONFIG).forEach(([category, config]) => {
    if (textMatches(text, config.keywords)) {
      target[category] += numericValue;
    }
  });
};

const getSeverityWeight = (severity = "") => {
  const normalized = normalizeText(severity);
  if (["extreme", "severe"].includes(normalized)) return 20;
  if (["moderate"].includes(normalized)) return 14;
  return 8;
};

const getUrgencyWeight = (urgency = "") => {
  const normalized = normalizeText(urgency);
  if (normalized === "immediate") return 1.4;
  if (normalized === "expected") return 1.2;
  return 1;
};

const classifySeverity = (readinessScore) => {
  if (readinessScore < 40) return "Critical";
  if (readinessScore < 75) return "Stressed";
  return "Stable";
};

const rankSeverity = (severity) => {
  if (severity === "Critical") return 3;
  if (severity === "Stressed") return 2;
  return 1;
};

const buildProbabilityLabel = (score) => {
  if (score >= 0.75) return "High";
  if (score >= 0.45) return "Medium";
  if (score >= 0.15) return "Low";
  return "None";
};

const applyAlertDemand = (demand, alert) => {
  const text = normalizeText(`${alert.title} ${alert.description}`);
  const factor = getSeverityWeight(alert.severity) * getUrgencyWeight(alert.urgency);

  demand.water += factor * 1.1;
  demand.fuel += factor * 0.8;
  demand.shelter += factor * 0.9;
  demand.medical += factor * 0.6;
  demand.food += factor * 0.95;

  if (textMatches(text, ["flood", "rain", "river", "water"])) {
    demand.water += 10;
    demand.shelter += 6;
  }

  if (textMatches(text, ["storm", "wind", "hurricane", "tornado"])) {
    demand.fuel += 8;
    demand.shelter += 8;
  }

  if (textMatches(text, ["fire", "wildfire", "smoke"])) {
    demand.water += 6;
    demand.medical += 7;
  }

  if (textMatches(text, ["snow", "ice", "freeze", "blizzard"])) {
    demand.fuel += 10;
    demand.shelter += 7;
  }
};

const addOfferToSupply = (supply, offer) => {
  const quantity = Number(offer.remainingQuantity ?? offer.quantity ?? 0);
  addCategoryValue(supply, offer.resourceName, quantity);
};

const addInventoryToSupply = (supply, resource) => {
  const remainingQuantity =
    resource.remaining != null
      ? resource.remaining
      : Number(resource.totalStock || 0) - Number(resource.consumed || 0);
  const quantity = Math.max(0, Number(remainingQuantity || 0));
  addCategoryValue(supply, resource.name, quantity);
};

const buildAreaFilter = (latitude, longitude, areaName) => {
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    const range = 0.6;

    return {
      latitude: { $gte: latitude - range, $lte: latitude + range },
      longitude: { $gte: longitude - range, $lte: longitude + range },
    };
  }

  if (areaName) {
    return { areaName: new RegExp(areaName, "i") };
  }

  return {};
};

const hashText = (value = "") => {
  let hash = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const buildLocationDemandSignals = ({ latitude, longitude, areaName = "" }) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      demandBoost: createBlankResourceMap(),
      locationProfile: {
        densityIndex: 1,
        floodExposure: 1,
        windExposure: 1,
        accessStress: 1,
      },
    };
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const areaHash = hashText(areaName);
  const coordHash = Math.abs(
    Math.round(lat * 1000) * 31 + Math.round(lng * 1000) * 17 + areaHash
  );

  // Stable, location-sensitive locality profile based on coordinates plus optional area name.
  const densityIndex =
    0.9 +
    Math.abs(Math.sin(latRad * 3.4) + Math.cos(lngRad * 2.1)) * 0.22 +
    (coordHash % 5) * 0.03;
  const floodExposure =
    0.95 +
    Math.abs(Math.sin((lat + lng) * 0.21)) * 0.3 +
    ((coordHash >> 2) % 4) * 0.05;
  const windExposure =
    0.9 +
    Math.abs(Math.cos((lat - lng) * 0.17)) * 0.28 +
    ((coordHash >> 4) % 4) * 0.04;
  const accessStress =
    0.88 +
    Math.abs(Math.sin(latRad * 5.2 - lngRad * 1.8)) * 0.24 +
    ((coordHash >> 6) % 5) * 0.03;

  const demandBoost = {
    water: Math.round(8 * densityIndex + 10 * floodExposure + 4 * accessStress),
    fuel: Math.round(6 * densityIndex + 10 * windExposure + 7 * accessStress),
    shelter: Math.round(7 * densityIndex + 8 * floodExposure + 9 * windExposure),
    medical: Math.round(4 * densityIndex + 5 * accessStress + 4 * floodExposure),
    food: Math.round(6 * densityIndex + 6 * accessStress + 5 * floodExposure),
  };

  return {
    demandBoost,
    locationProfile: {
      densityIndex: roundTo(densityIndex),
      floodExposure: roundTo(floodExposure),
      windExposure: roundTo(windExposure),
      accessStress: roundTo(accessStress),
    },
  };
};

const buildAreaDemandSignals = async ({ latitude, longitude, areaName = "" }) => {
  const areaFilter = buildAreaFilter(latitude, longitude, areaName);
  const recentThreshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const nearbyOffers = await ResourceOffer.find(areaFilter).lean();
  const activity = createBlankResourceMap();

  nearbyOffers.forEach((offer) => {
    const totalQuantity = Number(offer.quantity || 0);
    const remainingQuantity = Number(offer.remainingQuantity ?? totalQuantity);
    const consumedQuantity = Math.max(0, totalQuantity - remainingQuantity);

    // Live inventory in the selected area should contribute using the actual listed value.
    if (remainingQuantity > 0) {
      addCategoryValue(activity, offer.resourceName, remainingQuantity);
    }

    // Previously shared/consumed quantities indicate additional pressure in the same area.
    if (consumedQuantity > 0) {
      addCategoryValue(activity, offer.resourceName, consumedQuantity);
    }

    (offer.applications || []).forEach((application) => {
      const appliedAt = application?.appliedAt ? new Date(application.appliedAt) : null;
      if (!appliedAt || appliedAt < recentThreshold) return;

      const requestWeight =
        application.status === "Approved"
          ? Number(application.approvedQuantity || application.requestedQuantity || 0)
          : Number(application.requestedQuantity || 0);

      addCategoryValue(activity, offer.resourceName, requestWeight);
    });
  });

  return {
    areaFilter,
    activity,
    offerCount: nearbyOffers.length,
  };
};

const buildReadinessAnalysis = async ({
  alerts = [],
  latitude,
  longitude,
  areaName = "",
}) => {
  const demand = createBlankResourceMap();
  const supply = createBlankResourceMap();

  alerts.forEach((alert) => applyAlertDemand(demand, alert));

  const locationSignals = buildLocationDemandSignals({
    latitude,
    longitude,
    areaName,
  });

  const [{ areaFilter, activity }, nearbyOffers, inventoryResources] = await Promise.all([
    buildAreaDemandSignals({ latitude, longitude, areaName }),
    ResourceOffer.find({
      ...buildAreaFilter(latitude, longitude, areaName),
      status: "Available",
    }),
    Resource.find(),
  ]);

  Object.keys(locationSignals.demandBoost).forEach((category) => {
    demand[category] += locationSignals.demandBoost[category];
  });

  Object.keys(activity).forEach((category) => {
    demand[category] += activity[category];
  });

  nearbyOffers.forEach((offer) => addOfferToSupply(supply, offer));
  inventoryResources.forEach((resource) => addInventoryToSupply(supply, resource));

  const analysis = Object.keys(CATEGORY_CONFIG)
    .map((category) => {
      const projectedDemand = Math.round(demand[category]);
      const confirmedSupply = Math.round(supply[category]);
      const gap = Math.max(0, projectedDemand - confirmedSupply);
      const readinessScore =
        projectedDemand > 0
          ? Math.min(100, Math.round((confirmedSupply / projectedDemand) * 100))
          : confirmedSupply > 0
          ? 100
          : 85;
      const severity = classifySeverity(readinessScore);

      return {
        category,
        demand: projectedDemand,
        supply: confirmedSupply,
        gap,
        readinessScore,
        severity,
        recommendedOfferTerms: CATEGORY_CONFIG[category].recommendedOfferTerms,
      };
    })
    .sort((a, b) => {
      if (rankSeverity(b.severity) !== rankSeverity(a.severity)) {
        return rankSeverity(b.severity) - rankSeverity(a.severity);
      }
      return b.gap - a.gap;
    });

  const criticalCategories = analysis.filter((item) => item.severity === "Critical");
  const stressedCategories = analysis.filter((item) => item.severity === "Stressed");
  const topStressPoint = analysis[0] || null;
  const averageReadiness = analysis.length
    ? Math.round(
        analysis.reduce((sum, item) => sum + item.readinessScore, 0) / analysis.length
      )
    : 100;

  return {
    analysis,
    summary: {
      averageReadiness,
      totalProjectedDemand: analysis.reduce((sum, item) => sum + item.demand, 0),
      totalConfirmedSupply: analysis.reduce((sum, item) => sum + item.supply, 0),
      criticalCount: criticalCategories.length,
      stressedCount: stressedCategories.length,
      locationProfile: locationSignals.locationProfile,
      topStressPoint: topStressPoint
        ? {
            category: topStressPoint.category,
            gap: topStressPoint.gap,
            severity: topStressPoint.severity,
          }
        : null,
    },
  };
};

const findRelevantProviders = async ({ category, latitude, longitude, areaName = "" }) => {
  const config = CATEGORY_CONFIG[category];

  if (!config) return [];

  const areaFilter = buildAreaFilter(latitude, longitude, areaName);
  const offers = await ResourceOffer.find({
    ...areaFilter,
    status: "Available",
    $or: config.recommendedOfferTerms.map((term) => ({
      resourceName: new RegExp(term, "i"),
    })),
  })
    .populate("postedBy", "name email phone isAdmin crisisAlertActive")
    .sort({ remainingQuantity: -1, updatedAt: -1 });

  return offers
    .filter((offer) => offer.postedBy && offer.postedBy.crisisAlertActive !== false)
    .reduce((acc, offer) => {
      const existing = acc.find(
        (entry) => String(entry.user._id) === String(offer.postedBy._id)
      );

      if (existing) {
        existing.offers.push(offer);
        existing.totalAvailable += Number(offer.remainingQuantity ?? offer.quantity ?? 0);
        return acc;
      }

      acc.push({
        user: offer.postedBy,
        offers: [offer],
        totalAvailable: Number(offer.remainingQuantity ?? offer.quantity ?? 0),
      });

      return acc;
    }, []);
};

const notifyProvidersForPredictedNeed = async ({
  category,
  gap,
  alerts = [],
  latitude,
  longitude,
  areaName = "",
  triggeredBy,
}) => {
  const providers = await findRelevantProviders({
    category,
    latitude,
    longitude,
    areaName,
  });

  const primaryAlert = alerts[0];
  const notifications = [];
  const io = global.__io;

  for (const provider of providers) {
    const offerNames = provider.offers.map((offer) => offer.resourceName).join(", ");
    const notification = await createNotification({
      io,
      user: provider.user._id,
      type: "PROACTIVE_RESOURCE_READINESS",
      title: `Possible ${category} shortage ahead`,
      message: `Forecasted demand suggests a ${category} gap of ${gap}. Since you listed ${offerNames}, please consider pre-offering help before conditions worsen.`,
      meta: {
        ownerId: provider.user._id,
        resourceId: provider.offers[0]?._id || null,
        resourceCategory: category,
        resourceName: provider.offers[0]?.resourceName || category,
        alertId: primaryAlert?.id || null,
        alertTitle: primaryAlert?.title || null,
        urgency: primaryAlert?.urgency || null,
        outreachStatus: "REQUESTED_PRE_OFFER",
        requesterId: triggeredBy || null,
      },
    });

    notifications.push(notification);
  }

  return {
    notifications,
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
};

const buildAlertPredictionSnapshot = async ({
  alerts = [],
  latitude,
  longitude,
  areaName = "",
}) => {
  const readiness = await buildReadinessAnalysis({
    alerts,
    latitude,
    longitude,
    areaName,
  });

  const alertDemand = createBlankResourceMap();
  alerts.forEach((alert) => applyAlertDemand(alertDemand, alert));

  const locationSignals = buildLocationDemandSignals({
    latitude,
    longitude,
    areaName,
  });
  const localityBoost = { ...locationSignals.demandBoost };

  const { activity, offerCount } = await buildAreaDemandSignals({
    latitude,
    longitude,
    areaName,
  });
  const activityBoost = { ...activity };

  const demand = createBlankResourceMap();
  Object.keys(demand).forEach((category) => {
    demand[category] =
      Number(alertDemand[category] || 0) +
      Number(localityBoost[category] || 0) +
      Number(activityBoost[category] || 0);
  });

  const gap = {};
  readiness.analysis.forEach((item) => {
    gap[item.category] = item.gap;
  });

  const resourceRisks = {
    water: buildProbabilityLabel((gap.water || 0) / 120 + 0.2),
    fuel: buildProbabilityLabel((gap.fuel || 0) / 120 + 0.18),
    shelter: buildProbabilityLabel((gap.shelter || 0) / 120 + 0.2),
    medical: buildProbabilityLabel((gap.medical || 0) / 120 + 0.15),
    food: buildProbabilityLabel((gap.food || 0) / 120 + 0.12),
  };

  const next6HoursMessages = [];
  const critical = readiness.analysis.filter((item) => item.severity === "Critical");
  const stressed = readiness.analysis.filter((item) => item.severity === "Stressed");

  if (critical.length) {
    next6HoursMessages.push(
      `Urgent preparation advised for ${critical
        .map((item) => item.category)
        .join(", ")} based on projected shortages.`
    );
  }

  if (stressed.length) {
    next6HoursMessages.push(
      `Community moderators should line up backup providers for ${stressed
        .map((item) => item.category)
        .join(", ")} before the peak impact window.`
    );
  }

  if (!next6HoursMessages.length) {
    next6HoursMessages.push(
      "No immediate stress point detected, but continue monitoring for forecast changes."
    );
  }

  return {
    demand: Object.keys(demand).reduce((acc, key) => {
      acc[key] = Math.round(demand[key]);
      return acc;
    }, {}),
    supply: readiness.analysis.reduce((acc, item) => {
      acc[item.category] = item.supply;
      return acc;
    }, {}),
    gap,
    confidence: `${Math.min(95, 50 + alerts.length * 8)}%`,
    summary: alerts.length
      ? `Forecast based on ${alerts.length} active alert(s), current listed supply, and local resource activity from ${offerCount} nearby offer(s).`
      : `No active alerts nearby. Demand estimate is using local resource activity from ${offerCount} nearby offer(s).`,
    recommendations: {
      first: "Prioritize outreach to members already listing matching resources.",
      second: "Use the readiness dashboard to close critical gaps before the crisis peaks.",
    },
    demandDrivers: {
      alertDemand: Object.keys(alertDemand).reduce((acc, key) => {
        acc[key] = Math.round(alertDemand[key]);
        return acc;
      }, {}),
      localityBoost,
      activityBoost: Object.keys(activityBoost).reduce((acc, key) => {
        acc[key] = Math.round(activityBoost[key]);
        return acc;
      }, {}),
    },
    localReportCount: alerts.length,
    unsafeReportCount: critical.length,
    resourceRisks,
    next6HoursMessages,
    localitySignals: locationSignals.locationProfile,
    readiness,
  };
};

module.exports = {
  CATEGORY_CONFIG,
  buildReadinessAnalysis,
  buildAlertPredictionSnapshot,
  findRelevantProviders,
  notifyProvidersForPredictedNeed,
};
