import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BellRing,
  Compass,
  Info,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import Layout from "../components/Layout";
import ReadinessDashboard from "../components/ReadinessDashboard";
import EmergencyControlPanel from "../components/EmergencyControlPanel";
import Toast from "../components/Toast";
import AlertUsersPanel from "../components/AlertUsersPanel";
import CommunityAlertsPanel from "../components/CommunityAlertsPanel";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:9457", {
  autoConnect: false,
});

const createMockAlerts = () => [
  {
    id: "demo-alert-1",
    title: "Severe Thunderstorm Warning",
    description:
      "Heavy storms are expected in your area with strong winds and possible flooding.",
    severity: "Severe",
    urgency: "Immediate",
    areas: "Local Area",
    status: "Actual",
  },
];

const createMockPrediction = () => ({
  demand: { water: 120, fuel: 90, shelter: 70, medical: 40, food: 85 },
  supply: { water: 40, fuel: 20, shelter: 25, medical: 15, food: 30 },
  gap: { water: 80, fuel: 70, shelter: 45, medical: 25, food: 55 },
  confidence: "78%",
  summary:
    "Demo forecast showing expected resource demand if the sample alerts remain active.",
  next6HoursMessages: [
    "High probability of water, pump, and shelter requests within the next 6 hours.",
  ],
  readiness: {
    analysis: [
      {
        category: "water",
        demand: 120,
        supply: 40,
        gap: 80,
        readinessScore: 33,
        severity: "Critical",
      },
      {
        category: "fuel",
        demand: 90,
        supply: 20,
        gap: 70,
        readinessScore: 22,
        severity: "Critical",
      },
    ],
    summary: {
      averageReadiness: 28,
      criticalCount: 2,
      stressedCount: 0,
      topStressPoint: { category: "water", gap: 80, severity: "Critical" },
    },
  },
});

const createMockReadiness = () => ({
  analysis: [
    {
      category: "water",
      demand: 120,
      supply: 40,
      gap: 80,
      readinessScore: 33,
      severity: "Critical",
    },
    {
      category: "fuel",
      demand: 90,
      supply: 20,
      gap: 70,
      readinessScore: 22,
      severity: "Critical",
    },
  ],
  summary: {
    averageReadiness: 30,
    criticalCount: 2,
    stressedCount: 0,
    topStressPoint: { category: "water", gap: 80, severity: "Critical" },
  },
  proactiveTargets: [
    {
      category: "water",
      gap: 80,
      providerCount: 1,
      providers: [{ name: "Pump Owner", totalAvailable: 2, matchedOffers: [] }],
    },
  ],
});

const tabs = [
  { id: "forecast", label: "Need Forecast" },
  { id: "dashboard", label: "Readiness Dashboard" },
];

function WeatherAlertsPage({ mode = "crisis-center" }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(
    mode === "alerts" ? "forecast" : "dashboard"
  );
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [toast, setToast] = useState("");
  const [location, setLocation] = useState({ lat: "", lng: "", areaName: "" });
  const [lastUpdated, setLastUpdated] = useState(null);

  const isAdmin = Boolean(user?.isAdmin);
  const isAlertsOnly = mode === "alerts";

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(window.__alertToastTimer);
    window.__alertToastTimer = window.setTimeout(() => setToast(""), 3500);
  };

  const fetchPredictions = async (lat, lng) => {
    try {
      setPredictionLoading(true);
      const response = await api.get("/alerts/prediction", {
        params: { lat, lng, areaName: location.areaName || "" },
      });
      setPrediction(response.data.prediction || createMockPrediction());
    } catch (error) {
      setPrediction(createMockPrediction());
    } finally {
      setPredictionLoading(false);
    }
  };

  const fetchReadiness = async (lat, lng) => {
    if (!isAdmin) {
      setReadiness(null);
      return;
    }

    try {
      setReadinessLoading(true);
      const response = await api.get("/readiness", {
        params: { lat, lng, areaName: location.areaName || "" },
      });
      setReadiness(response.data || createMockReadiness());
    } catch (error) {
      setReadiness(createMockReadiness());
    } finally {
      setReadinessLoading(false);
    }
  };

  const fetchAlerts = async (lat, lng) => {
    try {
      setLoading(true);
      const response = await api.get("/alerts", {
        params: { lat, lng, areaName: location.areaName || "" },
      });
      setAlerts(response.data.alerts || []);
      setLastUpdated(new Date());
    } catch (error) {
      setAlerts(createMockAlerts());
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  const loadLocationData = async (lat, lng) => {
    setAlerts([]);
    setPrediction(null);
    setReadiness(null);

    await Promise.all([fetchAlerts(lat, lng), fetchPredictions(lat, lng), fetchReadiness(lat, lng)]);
  };

  const handleManualLocation = () => {
    const lat = Number.parseFloat(location.lat);
    const lng = Number.parseFloat(location.lng);

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      loadLocationData(lat, lng);
    } else {
      showToast("Enter a valid latitude and longitude.");
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLocation((current) => ({
          ...current,
          lat: String(latitude),
          lng: String(longitude),
          areaName: current.areaName || user?.address || "",
        }));
        loadLocationData(latitude, longitude);
      },
      () => setLoading(false)
    );
  }, [isAdmin, user?.address]);

  useEffect(() => {
    if (!user?._id) {
      socket.disconnect();
      return;
    }

    socket.connect();

    const refreshAlerts = () => {
      const lat = Number.parseFloat(location.lat);
      const lng = Number.parseFloat(location.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        loadLocationData(lat, lng);
      }
    };

    socket.on("EMERGENCY_STATUS_CHANGE", refreshAlerts);
    socket.on("ALERTS_UPDATED", refreshAlerts);

    return () => {
      socket.off("EMERGENCY_STATUS_CHANGE", refreshAlerts);
      socket.off("ALERTS_UPDATED", refreshAlerts);
    };
  }, [user?._id, location.lat, location.lng, location.areaName]);

  const lifecycle = useMemo(
    () => [
      {
        title: "1. Detect",
        body: "The backend pulls public weather/disaster alerts for the selected location.",
      },
      {
        title: "2. Predict",
        body: "Simple demand logic estimates likely shortages such as pump, water, shelter, fuel, and food demand in the next 6 hours.",
      },
      {
        title: "3. Notify",
        body: "Admins can trigger proactive outreach to members who already listed matching resources and whose alert status is active.",
      },
      {
        title: "4. Review",
        body: "Moderators track readiness score, stress points, resource gaps, and alert-user availability before the crisis peaks.",
      },
    ],
    []
  );

  const demandCategories = prediction ? Object.keys(prediction.demand || {}) : [];

  return (
    <Layout
      title={isAlertsOnly ? "Weather & Disaster Alerts" : "Crisis Center"}
      subtitle={
        isAlertsOnly
          ? "Monitor public alerts and short-term predicted community needs for your location."
          : "One module for crisis detection, demand forecasting, proactive outreach, and moderator readiness."
      }
    >
      {toast && <Toast message={toast} />}

      <div className="space-y-8">
        {isAdmin && (
          <CommunityAlertsPanel onToast={showToast} user={user} />
        )}

        {!isAlertsOnly && (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                  Module Navigation
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  Forecast + Readiness in one place
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                      activeTab === tab.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-tight text-slate-800">
                Target Area
              </h2>
            </div>

            <div className="grid items-end gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400">LATITUDE</span>
                <input
                  type="text"
                  value={location.lat}
                  onChange={(event) =>
                    setLocation((current) => ({ ...current, lat: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400">LONGITUDE</span>
                <input
                  type="text"
                  value={location.lng}
                  onChange={(event) =>
                    setLocation((current) => ({ ...current, lng: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400">AREA NAME</span>
                <input
                  type="text"
                  value={location.areaName}
                  onChange={(event) =>
                    setLocation((current) => ({ ...current, areaName: event.target.value }))
                  }
                  placeholder={user?.address || "Dhaka North"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleManualLocation}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Update Location
              </button>
            </div>
          </section>

          <section className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Active Alerts
                </h2>
                <p className="text-2xl font-black text-slate-900">{alerts.length}</p>
              </div>
              <div
                className={`rounded-lg p-2 ${
                  alerts.length > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>

            <p className="mt-4 text-xs italic text-slate-500">
              Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "---"}
            </p>
          </section>
        </div>

        {!isAlertsOnly && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {lifecycle.map((step) => (
              <div key={step.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-blue-600" />
                  <p className="font-bold text-slate-900">{step.title}</p>
                </div>
                <p className="mt-3 text-sm text-slate-600">{step.body}</p>
              </div>
            ))}
          </section>
        )}

        {isAlertsOnly || activeTab === "forecast" ? (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-slate-50 p-6 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-600 p-2 text-white">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Predicted Need Snapshot</h2>
                  <p className="text-sm text-slate-500">
                    Forecasted resource pressure based on active alerts and currently listed supply
                  </p>
                </div>
              </div>

              {prediction && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Forecast Confidence</p>
                  <p className="text-sm font-bold text-blue-600">{prediction.confidence}</p>
                </div>
              )}
            </div>

            <div className="p-6">
              {loading || predictionLoading ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-100 py-12 text-center">
                  <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-slate-300" />
                  <p className="text-slate-500">Scanning regional alert data...</p>
                </div>
              ) : !prediction ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-100 py-12 text-center text-slate-500">
                  No forecast data available for this area yet.
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <StatCard icon={<Activity className="h-4 w-4" />} label="Alerts Used" value={alerts.length} />
                    <StatCard
                      icon={<AlertOctagon className="h-4 w-4" />}
                      label="Critical Gaps"
                      value={prediction.readiness?.summary?.criticalCount ?? 0}
                      color="text-red-500"
                    />
                    <div className="col-span-2 flex items-center gap-4 rounded-2xl bg-blue-50 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Info className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium leading-tight text-blue-900">
                        {prediction.summary}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-1">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Next 6 Hours
                      </h3>
                      {prediction.next6HoursMessages.map((message, index) => (
                        <div
                          key={`${message}-${index}`}
                          className="rounded-2xl bg-slate-900 p-4 text-xs font-medium leading-relaxed text-white"
                        >
                          {message}
                        </div>
                      ))}
                    </div>

                    <div className="lg:col-span-2">
                      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                        Estimated Demand Units
                      </h3>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {Object.entries(prediction.demand).map(([item, value]) => (
                          <div
                            key={item}
                            className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 transition-all hover:bg-slate-50"
                          >
                            <span className="text-sm font-bold capitalize text-slate-600">
                              {item}
                            </span>
                            <span className="text-sm font-black text-slate-900">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {prediction.localitySignals && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Compass className="h-4 w-4 text-blue-600" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                          Locality Signals
                        </h3>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <SignalCard
                          label="Density Index"
                          value={prediction.localitySignals.densityIndex}
                          hint="Higher density increases likely shared demand."
                        />
                        <SignalCard
                          label="Flood Exposure"
                          value={prediction.localitySignals.floodExposure}
                          hint="Higher flood exposure lifts water and shelter demand."
                        />
                        <SignalCard
                          label="Wind Exposure"
                          value={prediction.localitySignals.windExposure}
                          hint="Higher wind exposure lifts fuel and shelter demand."
                        />
                        <SignalCard
                          label="Access Stress"
                          value={prediction.localitySignals.accessStress}
                          hint="Higher access stress lifts food, fuel, and medical demand."
                        />
                      </div>
                    </div>
                  )}

                  {prediction.demandDrivers && demandCategories.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-600" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                          Demand Breakdown
                        </h3>
                      </div>

                      <div className="overflow-hidden rounded-3xl border border-slate-200">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
                            <tr>
                              <th className="px-4 py-3">Category</th>
                              <th className="px-4 py-3">Alert Demand</th>
                              <th className="px-4 py-3">Locality Boost</th>
                              <th className="px-4 py-3">Local Activity</th>
                              <th className="px-4 py-3">Final Demand</th>
                            </tr>
                          </thead>
                          <tbody>
                            {demandCategories.map((category) => (
                              <tr key={category} className="border-t border-slate-100">
                                <td className="px-4 py-4 font-bold capitalize text-slate-900">
                                  {category}
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-600">
                                  {prediction.demandDrivers.alertDemand?.[category] ?? 0}
                                </td>
                                <td className="px-4 py-4 text-sm text-blue-700">
                                  {prediction.demandDrivers.localityBoost?.[category] ?? 0}
                                </td>
                                <td className="px-4 py-4 text-sm text-emerald-700">
                                  {prediction.demandDrivers.activityBoost?.[category] ?? 0}
                                </td>
                                <td className="px-4 py-4 text-sm font-black text-slate-900">
                                  {prediction.demand?.[category] ?? 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <BellRing className="h-4 w-4 text-amber-600" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                        Active Alert Feed
                      </h3>
                    </div>

                    {alerts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                        No active alert found for this area.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {alerts.map((alert) => (
                          <div key={alert.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{alert.title}</p>
                                {alert.source && (
                                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                    {alert.source === "community"
                                      ? "Community Alert"
                                      : alert.source === "admin"
                                      ? "Emergency Alert"
                                      : "Public Alert"}
                                  </p>
                                )}
                              </div>
                              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase text-red-700">
                                {alert.severity}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{alert.description}</p>
                            {alert.areas ? (
                              <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                                Area: {alert.areas}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="space-y-6">
            {isAdmin ? (
              <>
                <EmergencyControlPanel onToast={showToast} />
                <ReadinessDashboard
                  data={readiness}
                  loading={readinessLoading}
                  location={location}
                  alerts={alerts}
                  canNotify={isAdmin}
                  onOutreachSent={showToast}
                />
                <AlertUsersPanel onToast={showToast} />
              </>
            ) : (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
                This dashboard is admin-only because it includes outreach controls and alert-user activation.
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ icon, label, value, color = "text-slate-900" }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`rounded-lg bg-slate-50 p-2 ${color}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
        <p className={`text-xl font-black ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function SignalCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default WeatherAlertsPage;
