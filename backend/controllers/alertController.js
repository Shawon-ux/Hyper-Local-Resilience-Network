const SafeReport = require('../models/SafeReport');
const ResourceOffer = require('../models/ResourceOffer');

const createMockAlerts = () => [
  {
    id: 'mock-alert-1',
    title: 'Severe Thunderstorm Warning',
    description: 'A severe thunderstorm capable of producing hail and damaging winds is approaching the area.',
    severity: 'Severe',
    urgency: 'Immediate',
    areas: 'Local Area',
    effective: new Date().toISOString(),
    expires: new Date(Date.now() + 3600000).toISOString(),
    status: 'Actual',
  },
  {
    id: 'mock-alert-2',
    title: 'Flood Watch',
    description: 'Flooding is possible due to heavy rainfall in the region.',
    severity: 'Moderate',
    urgency: 'Expected',
    areas: 'Nearby Area',
    effective: new Date().toISOString(),
    expires: new Date(Date.now() + 7200000).toISOString(),
    status: 'Actual',
  },
];

const normalizeText = (text) => String(text || '').toLowerCase();

const textMatches = (text, terms) => terms.some((term) => normalizeText(text).includes(term));

const buildProbabilityLabel = (score) => {
  if (score >= 0.75) return 'High';
  if (score >= 0.45) return 'Medium';
  if (score >= 0.15) return 'Low';
  return 'None';
};

const buildDemandPrediction = async (lat, lng, alerts) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  const range = 0.8;
  const now = new Date();
  const recentWindow = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  const nearbyReports = await SafeReport.find({
    latitude: { $gte: latitude - range, $lte: latitude + range },
    longitude: { $gte: longitude - range, $lte: longitude + range },
  });

  const nearbyOffers = await ResourceOffer.find({
    latitude: { $gte: latitude - range, $lte: latitude + range },
    longitude: { $gte: longitude - range, $lte: longitude + range },
    status: 'Available',
  });

  const unsafeCount = nearbyReports.filter((report) => report.status === 'Unsafe').length;
  const localReportCount = nearbyReports.length;
  const recentUnsafeCount = nearbyReports.filter(
    (report) => report.status === 'Unsafe' && report.createdAt >= recentWindow
  ).length;

  const demand = {
    water: 0,
    fuel: 0,
    shelter: 0,
    medical: 0,
    food: 0,
  };

  const requestLikelihood = {
    sandbags: 0,
    water: 0,
    fuel: 0,
    shelter: 0,
    medical: 0,
    food: 0,
  };

  let floodRelated = false;

  alerts.forEach((alert) => {
    const normalized = normalizeText(`${alert.title} ${alert.description}`);
    const severityFactor = alert.severity === 'Severe' ? 1.3 : alert.severity === 'Moderate' ? 1.1 : 1;
    const urgencyFactor = alert.urgency === 'Immediate' ? 1.25 : alert.urgency === 'Expected' ? 1.1 : 1;
    const eventFactor = 6 * severityFactor * urgencyFactor;

    demand.water += eventFactor * 1.1;
    demand.shelter += eventFactor * 0.95;
    demand.fuel += eventFactor * 0.9;
    demand.medical += eventFactor * 0.65;
    demand.food += eventFactor * 0.9;

    if (textMatches(normalized, ['flood', 'heavy rain', 'river', 'water', 'flash flood'])) {
      floodRelated = true;
      demand.water += 10;
      demand.shelter += 8;
      demand.food += 6;
      requestLikelihood.sandbags += 0.7;
      requestLikelihood.water += 0.55;
      requestLikelihood.shelter += 0.45;
    }

    if (textMatches(normalized, ['storm', 'hurricane', 'tornado', 'wind', 'gust'])) {
      demand.fuel += 10;
      demand.shelter += 9;
      demand.water += 6;
      requestLikelihood.fuel += 0.65;
      requestLikelihood.shelter += 0.5;
      requestLikelihood.water += 0.35;
    }

    if (textMatches(normalized, ['fire', 'wildfire', 'smoke', 'ember'])) {
      demand.shelter += 6;
      demand.medical += 8;
      demand.water += 5;
      requestLikelihood.medical += 0.6;
      requestLikelihood.shelter += 0.4;
    }

    if (textMatches(normalized, ['ice', 'snow', 'blizzard', 'freeze', 'frost'])) {
      demand.fuel += 10;
      demand.shelter += 7;
      demand.food += 7;
      requestLikelihood.fuel += 0.75;
      requestLikelihood.shelter += 0.55;
    }

    if (textMatches(normalized, ['heat', 'heatwave', 'extreme heat'])) {
      demand.water += 12;
      demand.medical += 5;
      requestLikelihood.water += 0.7;
      requestLikelihood.medical += 0.45;
    }

    if (textMatches(normalized, ['sandbag', 'sand bags', 'barrier', 'levee', 'embankment'])) {
      demand.shelter += 6;
      requestLikelihood.sandbags += 0.8;
    }
  });

  if (alerts.length === 0 && localReportCount > 0) {
    demand.water += 4;
    demand.food += 3;
    requestLikelihood.water += 0.35;
    requestLikelihood.shelter += 0.25;
  }

  const reportImpact = 1 + Math.min(0.8, unsafeCount * 0.08 + recentUnsafeCount * 0.05);
  const historyImpact = 1 + Math.min(0.5, localReportCount * 0.02 + recentUnsafeCount * 0.05);

  Object.keys(demand).forEach((key) => {
    demand[key] = Math.round(Math.max(0, demand[key] * reportImpact + historyImpact * 1.2));
  });

  const supply = nearbyOffers.reduce(
    (summary, offer) => {
      const name = normalizeText(offer.resourceName);
      if (textMatches(name, ['water', 'hydration'])) summary.water += offer.quantity;
      if (textMatches(name, ['fuel', 'gas', 'diesel', 'petrol', 'propane'])) summary.fuel += offer.quantity;
      if (textMatches(name, ['shelter', 'tent', 'blanket', 'tarpaulin', 'sandbag', 'barrier'])) summary.shelter += offer.quantity;
      if (textMatches(name, ['medical', 'bandage', 'mask', 'medicine', 'first aid'])) summary.medical += offer.quantity;
      if (textMatches(name, ['food', 'meal', 'ration', 'snack'])) summary.food += offer.quantity;
      return summary;
    },
    { water: 0, fuel: 0, shelter: 0, medical: 0, food: 0 }
  );

  const gap = {
    water: Math.max(0, demand.water - supply.water),
    fuel: Math.max(0, demand.fuel - supply.fuel),
    shelter: Math.max(0, demand.shelter - supply.shelter),
    medical: Math.max(0, demand.medical - supply.medical),
    food: Math.max(0, demand.food - supply.food),
  };

  const resourceRisks = {
    sandbags: buildProbabilityLabel(Math.min(1, requestLikelihood.sandbags + (floodRelated ? 0.1 : 0))),
    water: buildProbabilityLabel(Math.min(1, requestLikelihood.water + unsafeCount * 0.03)),
    fuel: buildProbabilityLabel(Math.min(1, requestLikelihood.fuel + unsafeCount * 0.02)),
    shelter: buildProbabilityLabel(Math.min(1, requestLikelihood.shelter + unsafeCount * 0.03)),
    medical: buildProbabilityLabel(Math.min(1, requestLikelihood.medical + unsafeCount * 0.02)),
    food: buildProbabilityLabel(Math.min(1, requestLikelihood.food + unsafeCount * 0.02)),
  };

  const next6HoursMessages = [];

  if (resourceRisks.sandbags === 'High') {
    next6HoursMessages.push('High probability of sandbag requests in the next 6 hours.');
  } else if (resourceRisks.sandbags === 'Medium') {
    next6HoursMessages.push('Medium probability of sandbag requests in the next 6 hours.');
  }

  if (resourceRisks.fuel === 'High') {
    next6HoursMessages.push('High probability of fuel or generator support requests soon.');
  }

  if (resourceRisks.water === 'High') {
    next6HoursMessages.push('High probability of water deliveries or hydration support requests in the next 6 hours.');
  }

  if (next6HoursMessages.length === 0) {
    next6HoursMessages.push('No strong resource request pattern found for the next 6 hours. Continue monitoring alerts.');
  }

  const confidenceScore = Math.min(0.95, 0.2 + alerts.length * 0.15 + unsafeCount * 0.04 + recentUnsafeCount * 0.03);

  return {
    demand,
    supply,
    gap,
    confidence: `${Math.round(confidenceScore * 100)}%`,
    summary:
      alerts.length > 0
        ? `Based on ${alerts.length} alert(s) and ${localReportCount} nearby report(s), the system predicts elevated demand and possible sandbag support over the next 6 hours.`
        : localReportCount > 0
        ? `No active alerts, but ${unsafeCount} unsafe report(s) nearby indicate local demand may still rise.`
        : 'No active alerts or unsafe local reports nearby. Continue monitoring and keep basic supplies ready.',
    recommendations: {
      first: 'Review available local resource offers and prioritize water, shelter, and medical supplies.',
      second: 'Stay alert for updated notices and coordinate with nearby volunteers if alerts remain active.',
    },
    localReportCount,
    unsafeReportCount: unsafeCount,
    resourceRisks,
    next6HoursMessages,
  };
};

const getAlerts = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const alerts = createMockAlerts();
    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return res.status(500).json({ message: 'Failed to load alerts' });
  }
};

const getAlertPrediction = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const alerts = createMockAlerts();
    const prediction = await buildDemandPrediction(lat, lng, alerts);
    res.json({ prediction });
  } catch (error) {
    console.error('Error generating prediction:', error);
    return res.status(500).json({ message: 'Failed to generate prediction' });
  }
};

module.exports = { getAlerts, getAlertPrediction };