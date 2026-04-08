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

const buildDemandPrediction = async (lat, lng, alerts) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  const range = 0.6;

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

  const textMatches = (text, terms) => terms.some((term) => normalizeText(text).includes(term));

  const demand = {
    water: 0,
    fuel: 0,
    shelter: 0,
    medical: 0,
    food: 0,
  };

  alerts.forEach((alert) => {
    const normalized = normalizeText(`${alert.title} ${alert.description}`);
    const baseSeverity = alert.severity === 'Severe' ? 20 : alert.severity === 'Moderate' ? 14 : alert.severity === 'Minor' ? 8 : 10;
    const baseUrgency = alert.urgency === 'Immediate' ? 1.4 : alert.urgency === 'Expected' ? 1.2 : 1;
    const eventFactor = baseSeverity * baseUrgency;

    demand.water += eventFactor * 1.1;
    demand.shelter += eventFactor * 0.9;
    demand.fuel += eventFactor * 0.8;
    demand.medical += eventFactor * 0.6;
    demand.food += eventFactor * 0.95;

    if (textMatches(normalized, ['flood', 'heavy rain', 'river', 'water'])) {
      demand.water += 7;
      demand.shelter += 5;
      demand.food += 4;
    }

    if (textMatches(normalized, ['storm', 'hurricane', 'tornado', 'wind'])) {
      demand.fuel += 6;
      demand.shelter += 7;
      demand.water += 6;
    }

    if (textMatches(normalized, ['fire', 'wildfire', 'smoke'])) {
      demand.shelter += 5;
      demand.medical += 5;
      demand.water += 4;
    }

    if (textMatches(normalized, ['ice', 'snow', 'blizzard', 'freeze'])) {
      demand.fuel += 8;
      demand.shelter += 6;
      demand.food += 5;
    }
  });

  const reportImpact = 1 + Math.min(0.6, unsafeCount * 0.08);
  Object.keys(demand).forEach((key) => {
    demand[key] = Math.round(Math.max(0, demand[key] * reportImpact));
  });

  const supply = nearbyOffers.reduce(
    (summary, offer) => {
      const name = normalizeText(offer.resourceName);
      if (textMatches(name, ['water', 'hydration'])) summary.water += offer.quantity;
      if (textMatches(name, ['fuel', 'gas', 'diesel', 'petrol', 'propane'])) summary.fuel += offer.quantity;
      if (textMatches(name, ['shelter', 'tent', 'blanket', 'tarpaulin'])) summary.shelter += offer.quantity;
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

  const confidence = Math.min(0.95, 0.25 + alerts.length * 0.18 + unsafeCount * 0.05 + (localReportCount > 0 ? 0.05 : 0));

  return {
    demand,
    supply,
    gap,
    confidence: `${Math.round(confidence * 100)}%`,
    summary:
      alerts.length > 0
        ? `Forecast based on ${alerts.length} alert(s) and ${localReportCount} local report(s). Water, shelter, and medical supplies are prioritized.`
        : localReportCount > 0
        ? `No active alerts, but ${unsafeCount} unsafe local report(s) suggest preparedness should focus on water and shelter.`
        : 'No active alerts or unsafe local reports nearby. Continue monitoring and keep basic supplies ready.' ,
    recommendations: {
      first: 'Review available local resource offers and prioritize water, shelter, and medical items.',
      second: 'Stay alert for updated notices and coordinate with nearby volunteers if alerts remain active.',
    },
    localReportCount,
    unsafeReportCount: unsafeCount,
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