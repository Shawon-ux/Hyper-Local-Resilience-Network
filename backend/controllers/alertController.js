const axios = require('axios');

const getAlerts = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // For demo purposes, return mock alerts since NWS API may not work for all locations
    const mockAlerts = [
      {
        id: 'mock-alert-1',
        title: 'Severe Thunderstorm Warning',
        description: 'A severe thunderstorm capable of producing quarter size hail and damaging winds in excess of 60 mph is approaching the area.',
        severity: 'Severe',
        urgency: 'Immediate',
        areas: 'Test County, Sample State',
        effective: new Date().toISOString(),
        expires: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        status: 'Actual',
      },
      {
        id: 'mock-alert-2',
        title: 'Flood Watch',
        description: 'Flooding is possible in the warned area due to heavy rainfall.',
        severity: 'Moderate',
        urgency: 'Expected',
        areas: 'Nearby Areas',
        effective: new Date().toISOString(),
        expires: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        status: 'Actual',
      },
    ];

    // Uncomment below to use real NWS API
    /*
    const response = await axios.get(`https://api.weather.gov/alerts/active?point=${lat},${lng}`, {
      headers: {
        'User-Agent': 'HyperLocalResilienceNetwork/1.0 (contact@example.com)',
      },
    });

    const alerts = response.data.features.map(feature => ({
      id: feature.id,
      title: feature.properties.headline,
      description: feature.properties.description,
      severity: feature.properties.severity,
      urgency: feature.properties.urgency,
      areas: feature.properties.areaDesc,
      effective: feature.properties.effective,
      expires: feature.properties.expires,
      status: feature.properties.status,
    }));
    */

    res.json({ alerts: mockAlerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    // Return mock alerts even on error for demo
    const mockAlerts = [
      {
        id: 'error-mock-1',
        title: 'API Error - Mock Alert',
        description: 'This is a mock alert since the weather API encountered an error.',
        severity: 'Minor',
        urgency: 'Expected',
        areas: 'Your Area',
        effective: new Date().toISOString(),
        expires: new Date(Date.now() + 3600000).toISOString(),
        status: 'Test',
      },
    ];
    res.json({ alerts: mockAlerts });
  }
};

module.exports = { getAlerts };