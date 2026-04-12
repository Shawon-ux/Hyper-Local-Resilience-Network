import { useEffect, useState } from 'react';
import { AlertTriangle, Info, MapPin, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';

const formatNumber = (value) => Number(value || 0).toLocaleString();

const WeatherAlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState({ lat: '', lng: '' });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState('');

  const fetchPredictions = async (lat, lng) => {
    try {
      setPredictionLoading(true);
      setPredictionError('');
      const response = await api.get('/alerts/prediction', {
        params: { lat, lng },
      });
      setPrediction(response.data.prediction || null);
    } catch (err) {
      setPredictionError('Unable to calculate local demand forecast.');
      console.error(err);
    } finally {
      setPredictionLoading(false);
    }
  };

  const fetchAlerts = async (lat, lng) => {
    if (!lat || !lng) return;

    try {
      setLoading(true);
      setError('');
      const response = await api.get('/alerts', {
        params: { lat, lng },
      });
      setAlerts(response.data.alerts || []);
      setLastUpdated(new Date());
      await fetchPredictions(lat, lng);
    } catch (err) {
      setError('Unable to load alerts at the moment. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude.toString(), lng: longitude.toString() });
          fetchAlerts(latitude, longitude);
        },
        () => {
          setError('Unable to get your location. Please enter coordinates manually.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
    }
  };

  const handleManualLocation = () => {
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lng);
    if (isNaN(lat) || isNaN(lng)) {
      setError('Please enter valid latitude and longitude.');
      return;
    }
    fetchAlerts(lat, lng);
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const demandCards = prediction
    ? [
        { label: 'Water', value: `${formatNumber(prediction.demand.water)} liters` },
        { label: 'Fuel', value: `${formatNumber(prediction.demand.fuel)} liters` },
        { label: 'Shelter', value: `${formatNumber(prediction.demand.shelter)} units` },
        { label: 'Medical', value: `${formatNumber(prediction.demand.medical)} kits` },
        { label: 'Food', value: `${formatNumber(prediction.demand.food)} packs` },
      ]
    : [];

  const riskCards = prediction
    ? [
        { label: 'Sandbag risk', value: prediction.resourceRisks.sandbags },
        { label: 'Fuel request risk', value: prediction.resourceRisks.fuel },
        { label: 'Water request risk', value: prediction.resourceRisks.water },
        { label: 'Shelter request risk', value: prediction.resourceRisks.shelter },
      ]
    : [];

  return (
    <Layout
      title="Weather & Disaster Alerts"
      subtitle="Stay informed about potential crises and local resource demand."
    >
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-slate-900">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
                  Location Settings
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Fetch alerts for your area or use manual coordinates.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <button
                onClick={getCurrentLocation}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <MapPin className="h-4 w-4" />
                Use Current Location
              </button>

              <div className="grid gap-4 sm:grid-cols-[1fr,1fr,auto]">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Latitude</span>
                  <input
                    type="text"
                    value={location.lat}
                    onChange={(e) => setLocation((prev) => ({ ...prev, lat: e.target.value }))}
                    placeholder="23.7732"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Longitude</span>
                  <input
                    type="text"
                    value={location.lng}
                    onChange={(e) => setLocation((prev) => ({ ...prev, lng: e.target.value }))}
                    placeholder="90.4241"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <button
                  onClick={handleManualLocation}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Update Location
                </button>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 text-slate-900">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Active alerts
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Alerts are fetched from the backend and matched against local demand history.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-sm">
                  <p className="font-semibold text-slate-900">Last updated</p>
                  <p>{lastUpdated ? lastUpdated.toLocaleTimeString() : 'Not yet refreshed'}</p>
                </div>
                <button
                  onClick={() => fetchAlerts(parseFloat(location.lat), parseFloat(location.lng))}
                  disabled={loading || !location.lat || !location.lng}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh alerts
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-slate-900">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Alert feed
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Live alert summaries are shown here for your selected area.
                </p>
              </div>
            </div>
            <span className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              {alerts.length} Active
            </span>
          </div>

          {loading ? (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <p className="text-sm">Checking for the latest alerts in your area…</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-emerald-50 px-6 py-12 text-center text-slate-700">
              <p className="text-xl font-semibold">No active alerts found</p>
              <p className="mt-2 text-sm text-slate-500">Your locality is currently clear of major weather and disaster warnings.</p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {alerts.map((alert) => (
                <article key={alert.id} className="overflow-hidden rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-600/10 text-red-700">
                          <AlertTriangle className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="text-xl font-semibold text-red-900">{alert.title}</h3>
                          <p className="text-sm text-slate-600">{alert.areas}</p>
                        </div>
                      </div>
                      <p className="text-sm leading-6 text-red-800">{alert.description}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-3xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Severity</p>
                        <p className="mt-2 font-semibold text-red-700">{alert.severity || 'Unknown'}</p>
                      </div>
                      <div className="rounded-3xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Urgency</p>
                        <p className="mt-2 font-semibold text-orange-700">{alert.urgency || 'Unknown'}</p>
                      </div>
                      <div className="rounded-3xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
                        <p className="mt-2 font-semibold text-slate-900">{alert.status || 'Actual'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 text-sm text-slate-500">
                    {alert.effective && (
                      <p>
                        <span className="font-semibold text-slate-900">Effective:</span>{' '}
                        {new Date(alert.effective).toLocaleString()}
                      </p>
                    )}
                    {alert.expires && (
                      <p>
                        <span className="font-semibold text-slate-900">Expires:</span>{' '}
                        {new Date(alert.expires).toLocaleString()}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.2fr,0.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div className="flex items-start gap-3 text-slate-900">
                <Info className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                    Resource demand forecast
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    A simple prediction based on current alerts and local report history.
                  </p>
                </div>
              </div>
              <p className="mt-6 text-sm leading-7 text-slate-700">
                {predictionLoading
                  ? 'Calculating demand forecast...'
                  : prediction
                  ? prediction.summary
                  : 'Forecast details will appear here once alerts are loaded.'}
              </p>
              {prediction?.next6HoursMessages?.length > 0 && (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Key insights</p>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                    {prediction.next6HoursMessages.map((message, index) => (
                      <p key={index} className="rounded-2xl bg-slate-50 px-4 py-3">
                        {message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {predictionError && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {predictionError}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Forecast confidence</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{prediction?.confidence || 'Pending'}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Local reports</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{prediction ? prediction.localReportCount : '-'}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Unsafe reports</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{prediction ? prediction.unsafeReportCount : '-'}</p>
                </div>
              </div>
              {prediction && (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {riskCards.map((card) => (
                    <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{card.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {predictionLoading ? (
              <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin" />
                <p className="mt-3 text-sm">Forecast is being updated.</p>
              </div>
            ) : prediction ? (
              demandCards.map((card) => (
                <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                  <p className="mt-3 text-xl font-semibold text-slate-900">{card.value}</p>
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                <p className="text-sm">No demand forecast available. Refresh your location to load predictions.</p>
              </div>
            )}
          </div>

          {prediction && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
                <p className="font-semibold text-slate-900">Current supply gap</p>
                <p className="mt-3 text-sm text-slate-600">Water gap: {formatNumber(prediction.gap.water)} liters</p>
                <p className="mt-1 text-sm text-slate-600">Shelter gap: {formatNumber(prediction.gap.shelter)} units</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
                <p className="font-semibold text-slate-900">Recommended action</p>
                <p className="mt-3 text-sm text-slate-600">{prediction.recommendations.first}</p>
                <p className="mt-2 text-sm text-slate-600">{prediction.recommendations.second}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default WeatherAlertsPage;
