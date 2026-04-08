import { useEffect, useState } from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';
import api from '../services/api';

const WeatherAlerts = ({ userCenter }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!userCenter.lat || !userCenter.lng) return;

      try {
        const response = await api.get('/alerts', {
          params: { lat: userCenter.lat, lng: userCenter.lng },
        });
        setAlerts(response.data.alerts);
      } catch (err) {
        setError('Failed to fetch weather alerts');
        console.error('Error fetching alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [userCenter]);

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
          Weather Alerts
        </h3>
        <p className="text-gray-500">Loading alerts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
          Weather Alerts
        </h3>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-green-500" />
          Weather Alerts
        </h3>
        <p className="text-gray-500">No active weather alerts in your area.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
        Weather Alerts ({alerts.length})
      </h3>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="border border-red-200 rounded-lg p-3 bg-red-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-red-800">{alert.title}</h4>
                <p className="text-sm text-red-700 mt-1">{alert.description}</p>
                <div className="flex items-center mt-2 text-xs text-gray-600">
                  <MapPin className="h-3 w-3 mr-1" />
                  {alert.areas}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>Severity: {alert.severity}</span>
                  <span>Urgency: {alert.urgency}</span>
                </div>
                {alert.effective && (
                  <div className="text-xs text-gray-500 mt-1">
                    Effective: {new Date(alert.effective).toLocaleString()}
                  </div>
                )}
                {alert.expires && (
                  <div className="text-xs text-gray-500">
                    Expires: {new Date(alert.expires).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherAlerts;