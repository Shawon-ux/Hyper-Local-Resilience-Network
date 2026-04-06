import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import Layout from '../components/Layout';
import Panel from '../components/Panel';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import Toast from '../components/Toast';
import StatCard from '../components/StatCard';
import MapView from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:9457', {
  autoConnect: false,
});

const defaultCenter = {
  lat: 23.8103,
  lng: 90.4125,
};

function extractUserLat(user) {
  return Number(user?.location?.lat ?? user?.location?.latitude ?? user?.lat);
}

function extractUserLng(user) {
  return Number(user?.location?.lng ?? user?.location?.longitude ?? user?.lng);
}

function normalizeReports(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.reports)) return data.reports;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function SafeStatusModulePage() {
  const { user, logout, refreshUser } = useAuth();

  const [reports, setReports] = useState([]);
  const [myLatestReport, setMyLatestReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [emergencyActive, setEmergencyActive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [form, setForm] = useState({
    community: user?.address || '',
    status: 'Safe',
    latitude: '',
    longitude: '',
    note: '',
  });

  const userCenter = useMemo(() => {
    const lat = extractUserLat(user);
    const lng = extractUserLng(user);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    return defaultCenter;
  }, [user]);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(window.__moduleOneToastTimer);
    window.__moduleOneToastTimer = window.setTimeout(() => setToast(''), 3000);
  };

  const handleMapLocationSelect = ({ lat, lng }) => {
    setSelectedLocation({ lat, lng });
    setForm((prev) => ({
      ...prev,
      latitude: String(lat),
      longitude: String(lng),
    }));
  };

  const applyMySavedLocation = () => {
    if (!Number.isFinite(userCenter.lat) || !Number.isFinite(userCenter.lng)) return;

    setSelectedLocation({
      lat: userCenter.lat,
      lng: userCenter.lng,
    });

    setForm((prev) => ({
      ...prev,
      latitude: String(userCenter.lat),
      longitude: String(userCenter.lng),
      community: prev.community || user?.address || '',
    }));
  };

  const useBrowserLocation = () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support geolocation.');
      return;
    }

    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setSelectedLocation({ lat, lng });

        setForm((prev) => ({
          ...prev,
          latitude: String(lat),
          longitude: String(lng),
        }));
      },
      () => {
        setError('Unable to access your current location.');
      }
    );
  };

  const fetchEmergencyState = async () => {
    try {
      const { data } = await api.get('/safe-status/meta');
      if (typeof data?.emergencyActive === 'boolean') {
        setEmergencyActive(data.emergencyActive);
      } else {
        setEmergencyActive(true);
      }
    } catch {
      setEmergencyActive(true);
    }
  };

  const fetchReports = async () => {
    const { data } = await api.get('/safe-status');
    const normalized = normalizeReports(data);

    setReports(normalized);

    const mine = normalized
      .filter((item) => {
        const possibleId = item?.user?._id || item?.userId;
        return possibleId === user?._id || item?.email === user?.email || item?.userName === user?.name;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    setMyLatestReport(mine[0] || null);
    setLastUpdated(new Date());
  };

  const loadEverything = async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([fetchEmergencyState(), fetchReports(), refreshUser?.()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load safe status data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEverything();
  }, []);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      community: prev.community || user?.address || '',
    }));
  }, [user]);

  useEffect(() => {
    socket.connect();

    const refresh = () => {
      fetchReports().catch(() => {});
    };

    const events = [
      'safeStatusCreated',
      'safeStatusUpdated',
      'safeStatusDeleted',
      'safeStatusValidated',
      'emergencyDeclared',
      'emergencyEnded',
    ];

    events.forEach((event) => socket.on(event, refresh));

    return () => {
      events.forEach((event) => socket.off(event, refresh));
      socket.disconnect();
    };
  }, [user]);

  const stats = useMemo(() => {
    const safeCount = reports.filter((item) => item.status === 'Safe').length;
    const unsafeCount = reports.filter((item) => item.status === 'Unsafe').length;
    const verifiedCount = reports.filter((item) => item.validationStatus === 'Verified').length;

    return {
      total: reports.length,
      safe: safeCount,
      unsafe: unsafeCount,
      verified: verifiedCount,
    };
  }, [reports]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!emergencyActive) {
      setError('Safety reporting is available only during a declared emergency.');
      return;
    }

    if (!form.community.trim()) {
      setError('Community is required.');
      return;
    }

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('Latitude and longitude must be valid numbers.');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/safe-status', {
        community: form.community.trim(),
        status: form.status,
        latitude,
        longitude,
        note: form.note.trim(),
      });

      setForm((prev) => ({
        ...prev,
        status: 'Safe',
        note: '',
      }));

      await fetchReports();
      showToast(`You marked yourself as ${form.status}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit safe status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout
      title="Safety Status & Real-time Geospatial Map"
      subtitle="Users can report themselves as Safe/Unsafe during a declared emergency, and the system dynamically visualizes those authenticated reports on a live map."
      right={
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge value={emergencyActive ? 'Active' : 'Inactive'} />
          <button
            onClick={logout}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          >
            Logout
          </button>
        </div>
      }
    >
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Reports" value={stats.total} hint="Authenticated user submissions" />
        <StatCard label="Safe Reports" value={stats.safe} hint="Green markers on the map" />
        <StatCard label="Unsafe Reports" value={stats.unsafe} hint="Red markers on the map" />
        <StatCard label="Verified Reports" value={stats.verified} hint="System/community validated" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
        <div className="space-y-6">
          <Panel title="Your emergency status">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Signed in as</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{user?.name || 'Resident'}</h3>
                <p className="mt-1 text-sm text-slate-600">{user?.email}</p>
                <p className="mt-1 text-sm text-slate-600">{user?.address || 'No community address saved'}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Emergency State</p>
                  <StatusBadge value={emergencyActive ? 'Active' : 'Inactive'} />
                </div>
                <p className="text-sm text-slate-500">
                  When emergency mode is active, users can submit Safe/Unsafe reports.
                </p>
              </div>

              {myLatestReport ? (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Your latest report</p>
                    <StatusBadge value={myLatestReport.status} />
                  </div>
                  <p className="text-sm text-slate-600">Community: {myLatestReport.community}</p>
                  {myLatestReport.validationStatus ? (
                    <p className="mt-1 text-sm text-slate-600">
                      Validation: {myLatestReport.validationStatus}
                    </p>
                  ) : null}
                  {myLatestReport.note ? (
                    <p className="mt-1 text-sm text-slate-600">Note: {myLatestReport.note}</p>
                  ) : null}
                  {myLatestReport.createdAt ? (
                    <p className="mt-2 text-xs text-slate-400">
                      Submitted at: {new Date(myLatestReport.createdAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  You have not submitted any Safe/Unsafe report yet.
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Mark yourself Safe / Unsafe">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <FormField
                label="Community"
                name="community"
                value={form.community}
                onChange={handleChange}
                placeholder="ChipChapa Residence"
                required
              />

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  disabled={!emergencyActive || submitting}
                >
                  <option value="Safe">Safe</option>
                  <option value="Unsafe">Unsafe</option>
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Latitude"
                  name="latitude"
                  value={form.latitude}
                  onChange={handleChange}
                  placeholder="23.8103"
                  required
                  disabled={!emergencyActive || submitting}
                />
                <FormField
                  label="Longitude"
                  name="longitude"
                  value={form.longitude}
                  onChange={handleChange}
                  placeholder="90.4125"
                  required
                  disabled={!emergencyActive || submitting}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={applyMySavedLocation}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Use saved profile location
                </button>

                <button
                  type="button"
                  onClick={useBrowserLocation}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Use current browser location
                </button>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Note (optional)</span>
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Optional status details, evacuation notes, injuries, etc."
                  disabled={!emergencyActive || submitting}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </label>

              {error && <p className="text-sm text-rose-600">{error}</p>}

              <button
                type="submit"
                disabled={!emergencyActive || submitting}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : `Submit ${form.status} Report`}
              </button>
            </form>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Real-time geospatial map"
            actions={
              <div className="text-right text-xs text-slate-400">
                {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Waiting for data'}
              </div>
            }
          >
            <p className="mb-4 text-sm text-slate-500">
              Click anywhere on the map to choose the exact location for the safety report.
              Latitude and longitude will update automatically.
            </p>

            {loading ? (
              <div className="grid h-[500px] place-items-center rounded-3xl border border-slate-200 bg-slate-50">
                <p className="text-sm text-slate-500">Loading map data...</p>
              </div>
            ) : (
              <MapView
                reports={reports}
                center={userCenter}
                selectedLocation={selectedLocation}
                onLocationSelect={handleMapLocationSelect}
                interactive={true}
              />
            )}
          </Panel>

          <Panel title="Live report feed">
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No reports available yet.
                </div>
              ) : (
                reports
                  .slice()
                  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                  .map((item) => (
                    <div
                      key={item._id || `${item.userName}-${item.createdAt}`}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.userName || item.name || 'Resident'}
                          </p>
                          <p className="text-sm text-slate-500">{item.community || 'Unknown community'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge value={item.status || 'Pending'} />
                          {item.validationStatus ? <StatusBadge value={item.validationStatus} /> : null}
                        </div>
                      </div>

                      {(item.latitude || item.location?.lat) && (item.longitude || item.location?.lng) ? (
                        <p className="mt-2 text-sm text-slate-600">
                          Location: {Number(item.latitude ?? item.location?.lat).toFixed(5)},{' '}
                          {Number(item.longitude ?? item.location?.lng).toFixed(5)}
                        </p>
                      ) : null}

                      {item.note ? <p className="mt-2 text-sm text-slate-600">Note: {item.note}</p> : null}

                      {item.createdAt ? (
                        <p className="mt-2 text-xs text-slate-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      <Toast message={toast} />
    </Layout>
  );
}