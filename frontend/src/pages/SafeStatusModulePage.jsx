import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Crosshair,
  LocateFixed,
  Lock,
  LogOut,
  MapPin,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Siren,
  UserRound,
  UsersRound,
  XCircle,
} from 'lucide-react';

import Layout from '../components/Layout';
import Panel from '../components/Panel';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import Toast from '../components/Toast';
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

function formatDateTime(value) {
  if (!value) return 'Unknown time';
  return new Date(value).toLocaleString();
}

function getReportLat(item) {
  return Number(item?.latitude ?? item?.location?.lat ?? item?.location?.latitude);
}

function getReportLng(item) {
  return Number(item?.longitude ?? item?.location?.lng ?? item?.location?.longitude);
}

function StatTile({ label, value, hint, icon: Icon, tone = 'blue' }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  };

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
        </div>

        <div className={`rounded-2xl p-3 ring-1 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {hint && <p className="mt-3 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

function LockedCoordinateField({ label, value }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
        <Lock className="h-3.5 w-3.5 text-slate-400" />
        {label}
      </span>

      <input
        type="text"
        value={value}
        placeholder="Use login or current location"
        readOnly
        required
        className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-500 outline-none"
      />
    </label>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-3xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="h-4 w-40 rounded-full bg-slate-200" />
              <div className="h-3 w-56 rounded-full bg-slate-100" />
            </div>
            <div className="h-8 w-20 rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

const statusOptions = [
  {
    value: 'Safe',
    title: "I'm Safe",
    description: 'Tell the community you are okay.',
    icon: ShieldCheck,
    selectedClass:
      'border-emerald-300 bg-emerald-50 text-emerald-800 ring-4 ring-emerald-100',
    iconClass: 'bg-emerald-600 text-white',
  },
  {
    value: 'Unsafe',
    title: 'Need Help',
    description: 'Share your location for urgent support.',
    icon: ShieldAlert,
    selectedClass:
      'border-rose-300 bg-rose-50 text-rose-800 ring-4 ring-rose-100',
    iconClass: 'bg-rose-600 text-white',
  },
];

export default function SafeStatusModulePage() {
  const { user, logout, refreshUser } = useAuth();

  const [reports, setReports] = useState([]);
  const [myLatestReport, setMyLatestReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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

  const savedUserLocation = useMemo(() => {
    const lat = extractUserLat(user);
    const lng = extractUserLng(user);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    return null;
  }, [user]);

  const userCenter = selectedLocation || savedUserLocation || defaultCenter;

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(window.__moduleOneToastTimer);
    window.__moduleOneToastTimer = window.setTimeout(() => setToast(''), 3000);
  };

  const applyMySavedLocation = () => {
    if (!savedUserLocation) {
      setError(
        'No saved login/profile location found. Use current browser location instead.'
      );
      return;
    }

    setError('');
    setSelectedLocation(savedUserLocation);

    setForm((prev) => ({
      ...prev,
      latitude: String(savedUserLocation.lat),
      longitude: String(savedUserLocation.lng),
      community: prev.community || user?.address || '',
    }));

    showToast('Login/profile location applied to the form.');
  };

  const useBrowserLocation = () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support geolocation.');
      return;
    }

    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setSelectedLocation(location);

        setForm((prev) => ({
          ...prev,
          latitude: String(location.lat),
          longitude: String(location.lng),
        }));

        showToast('Current browser location applied to the form.');
      },
      () => {
        setError(
          'Unable to access your current location. Please allow location permission and try again.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const fetchEmergencyState = async () => {
    try {
      const { data } = await api.get('/safe-status/meta');
      setEmergencyActive(Boolean(data?.emergencyActive));
    } catch (err) {
      console.error('Emergency state error:', err);
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

        return (
          possibleId === user?._id ||
          item?.email === user?.email ||
          item?.userName === user?.name
        );
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    setMyLatestReport(mine[0] || null);
    setLastUpdated(new Date());
  };

  const loadEverything = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      await Promise.all([
        fetchEmergencyState(),
        fetchReports(),
        refreshUser?.(),
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load safe status data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      community: prev.community || user?.address || '',
    }));
  }, [user]);

  useEffect(() => {
    if (!savedUserLocation) return;

    setSelectedLocation(savedUserLocation);

    setForm((prev) => ({
      ...prev,
      latitude: prev.latitude || String(savedUserLocation.lat),
      longitude: prev.longitude || String(savedUserLocation.lng),
    }));
  }, [savedUserLocation]);

  useEffect(() => {
    socket.connect();

    const refresh = () => {
      fetchReports().catch(() => {});
      fetchEmergencyState().catch(() => {});
    };

    const events = [
      'safeStatusCreated',
      'safeStatusUpdated',
      'safeStatusDeleted',
      'safeStatusValidated',
      'EMERGENCY_STATUS_CHANGE',
    ];

    events.forEach((event) => socket.on(event, refresh));

    return () => {
      events.forEach((event) => socket.off(event, refresh));
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const stats = useMemo(() => {
    const safeCount = reports.filter((item) => item.status === 'Safe').length;
    const unsafeCount = reports.filter((item) => item.status === 'Unsafe').length;
    const verifiedCount = reports.filter(
      (item) => item.validationStatus === 'Verified' || item.validated === true
    ).length;

    return {
      total: reports.length,
      safe: safeCount,
      unsafe: unsafeCount,
      verified: verifiedCount,
    };
  }, [reports]);

  const recentReports = useMemo(() => {
    return reports
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [reports]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
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
      setError(
        'Latitude and longitude are required. Use login profile location or current browser location.'
      );
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
      title="Safe Status"
      subtitle="Report your safety status using trusted location sources and view live emergency reports on the map."
      right={
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${
              emergencyActive
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                : 'bg-slate-100 text-slate-600 ring-slate-200'
            }`}
          >
            <Radio className="h-4 w-4" />
            Emergency {emergencyActive ? 'Active' : 'Inactive'}
          </div>

          <button
            type="button"
            onClick={() => loadEverything({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      }
    >
      <div className="mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-900 to-blue-600 p-6 text-white shadow-xl">
        <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/15">
              <Siren className="h-4 w-4" />
              Real-time emergency reporting
            </div>

            <h2 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              Let your community know if you are safe or need help.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
              Your coordinates are locked for safety and accuracy. Use your login profile location
              or current browser location to submit your report. The map is view-only and shows emergency reports.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={applyMySavedLocation}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                <MapPin className="h-4 w-4" />
                Use Login Location
              </button>

              <button
                type="button"
                onClick={useBrowserLocation}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15"
              >
                <LocateFixed className="h-4 w-4" />
                Use Current Location
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white/10 p-5 ring-1 ring-white/15">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-blue-100">Live community snapshot</p>
                <p className="text-2xl font-bold">{stats.total} reports</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-blue-100">Safe</p>
                <p className="mt-1 text-3xl font-bold text-emerald-200">
                  {stats.safe}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-blue-100">Need Help</p>
                <p className="mt-1 text-3xl font-bold text-rose-200">
                  {stats.unsafe}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-blue-100">
              {lastUpdated
                ? `Last updated ${lastUpdated.toLocaleTimeString()}`
                : 'Waiting for live data'}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total Reports"
          value={stats.total}
          hint="All authenticated submissions"
          icon={UsersRound}
          tone="blue"
        />
        <StatTile
          label="Safe Reports"
          value={stats.safe}
          hint="People marked as safe"
          icon={ShieldCheck}
          tone="emerald"
        />
        <StatTile
          label="Need Help"
          value={stats.unsafe}
          hint="People marked unsafe"
          icon={ShieldAlert}
          tone="rose"
        />
        <StatTile
          label="Verified"
          value={stats.verified}
          hint="Validated reports"
          icon={CheckCircle2}
          tone="violet"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[440px,1fr]">
        <div className="space-y-6">
          <Panel title="Your status center">
            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <UserRound className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">Signed in as</p>
                    <h3 className="mt-1 truncate text-lg font-bold text-slate-900">
                      {user?.name || 'Resident'}
                    </h3>
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {user?.email}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {user?.address || 'No community address saved'}
                    </p>
                  </div>
                </div>
              </div>

              {myLatestReport ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Your latest report
                    </p>
                    <StatusBadge value={myLatestReport.status} />
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-900">Community:</span>{' '}
                      {myLatestReport.community || 'N/A'}
                    </p>

                    {myLatestReport.note ? (
                      <p>
                        <span className="font-semibold text-slate-900">Note:</span>{' '}
                        {myLatestReport.note}
                      </p>
                    ) : null}

                    <p className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateTime(myLatestReport.createdAt)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  You have not submitted a safety report yet.
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Mark yourself Safe / Unsafe">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <span className="mb-3 block text-sm font-medium text-slate-700">
                  Choose your status
                </span>

                <div className="grid gap-3 sm:grid-cols-2">
                  {statusOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = form.status === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={!emergencyActive || submitting}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            status: option.value,
                          }))
                        }
                        className={`rounded-3xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          selected
                            ? option.selectedClass
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                              selected
                                ? option.iconClass
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="font-bold">{option.title}</p>
                            <p className="mt-1 text-sm opacity-80">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <FormField
                label="Community"
                name="community"
                value={form.community}
                onChange={handleChange}
                placeholder="Dhaka"
                required
              />

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Locked location coordinates
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Users cannot type latitude or longitude manually.
                    </p>
                  </div>
                  <Crosshair className="h-5 w-5 text-blue-600" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <LockedCoordinateField label="Latitude" value={form.latitude} />
                  <LockedCoordinateField label="Longitude" value={form.longitude} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={applyMySavedLocation}
                    disabled={!emergencyActive || submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <MapPin className="h-4 w-4" />
                    Login location
                  </button>

                  <button
                    type="button"
                    onClick={useBrowserLocation}
                    disabled={!emergencyActive || submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LocateFixed className="h-4 w-4" />
                    Current location
                  </button>
                </div>

                {selectedLocation ? (
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                    <p className="font-semibold text-blue-900">
                      Selected form location
                    </p>
                    <p className="mt-1">
                      Latitude: {Number(selectedLocation.lat).toFixed(5)}
                    </p>
                    <p>
                      Longitude: {Number(selectedLocation.lng).toFixed(5)}
                    </p>
                    <p className="mt-2 text-xs text-blue-600">
                      This is the location that will be submitted with your report.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                    Use login location or current location before submitting.
                  </div>
                )}
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Note optional
                </span>
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Example: I am safe at home, or I need help near the main road."
                  disabled={!emergencyActive || submitting}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </label>

              {error && (
                <div className="flex gap-3 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {!emergencyActive && (
                <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                  Emergency mode is inactive, so safety reports are currently disabled.
                </div>
              )}

              <button
                type="submit"
                disabled={!emergencyActive || submitting}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  form.status === 'Unsafe'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {form.status === 'Unsafe' ? (
                  <ShieldAlert className="h-4 w-4" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {submitting ? 'Submitting...' : `Submit ${form.status} Report`}
              </button>
            </form>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Emergency report map"
            actions={
              <div className="text-right text-xs text-slate-400">
                {lastUpdated
                  ? `Updated ${lastUpdated.toLocaleTimeString()}`
                  : 'Waiting for data'}
              </div>
            }
          >
            <div className="mb-4 rounded-3xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    View emergency report locations
                  </p>
                  <p className="mt-1 text-sm text-blue-700">
                    This map is view-only. Use the buttons in the form to update your report location.
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid h-[500px] place-items-center rounded-3xl border border-slate-200 bg-slate-50">
                <p className="text-sm text-slate-500">Loading map data...</p>
              </div>
            ) : (
              <>
                <MapView
                  reports={reports}
                  center={userCenter}
                  selectedLocation={selectedLocation}
                  interactive={false}
                />

                {selectedLocation ? (
                  <div className="mt-4 rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                    <p className="font-semibold text-blue-900">
                      Your selected form location
                    </p>
                    <p className="mt-1">
                      Latitude: {Number(selectedLocation.lat).toFixed(5)}
                    </p>
                    <p>
                      Longitude: {Number(selectedLocation.lng).toFixed(5)}
                    </p>
                    <p className="mt-2 text-xs text-blue-600">
                      This comes from Login location or Current location, not map click.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                    Use login location or current location before submitting.
                  </div>
                )}
              </>
            )}
          </Panel>

          <Panel title="Live report feed">
            {loading ? (
              <ReportSkeleton />
            ) : reports.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <ShieldQuestion className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-3 text-lg font-semibold text-slate-900">
                  No reports yet
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Once people submit safety updates, they will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="max-h-[680px] space-y-3 overflow-y-auto pr-1">
                {recentReports.map((item) => {
                  const lat = getReportLat(item);
                  const lng = getReportLng(item);
                  const isSafe = item.status === 'Safe';

                  return (
                    <article
                      key={item._id || `${item.userName}-${item.createdAt}`}
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                              isSafe
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {isSafe ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <XCircle className="h-5 w-5" />
                            )}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.userName || item.name || 'Resident'}
                            </p>
                            <p className="text-sm text-slate-500">
                              {item.community || 'Unknown community'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <StatusBadge value={item.status || 'Pending'} />
                          {item.validationStatus ? (
                            <StatusBadge value={item.validationStatus} />
                          ) : null}
                        </div>
                      </div>

                      {Number.isFinite(lat) && Number.isFinite(lng) ? (
                        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {lat.toFixed(5)}, {lng.toFixed(5)}
                        </p>
                      ) : null}

                      {item.note ? (
                        <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          {item.note}
                        </p>
                      ) : null}

                      <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(item.createdAt)}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <Toast message={toast} />
    </Layout>
  );
}