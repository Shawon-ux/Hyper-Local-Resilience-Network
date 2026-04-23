import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { BellPlus, Trash2 } from "lucide-react";
import api from "../services/api";

const severityOptions = ["Minor", "Moderate", "Severe", "Extreme"];
const urgencyOptions = ["Future", "Expected", "Immediate"];
const typeOptions = ["Flood", "Storm", "Earthquake", "Fire", "Heatwave", "Landslide"];

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:9457", {
  autoConnect: false,
});

export default function CommunityAlertsPanel({ onToast, user }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "Flood",
    severity: "Moderate",
    urgency: "Expected",
    area: "",
    description: "",
    isActive: true,
  });

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/alerts/community");
      setAlerts(data.alerts || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    if (!user?._id) {
      socket.disconnect();
      return;
    }

    socket.connect();
    const refresh = () => {
      loadAlerts();
    };

    socket.on("ALERTS_UPDATED", refresh);
    socket.on("EMERGENCY_STATUS_CHANGE", refresh);

    return () => {
      socket.off("ALERTS_UPDATED", refresh);
      socket.off("EMERGENCY_STATUS_CHANGE", refresh);
    };
  }, [user?._id]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await api.post("/alerts/community", form);
      setForm({
        title: "",
        type: "Flood",
        severity: "Moderate",
        urgency: "Expected",
        area: "",
        description: "",
        isActive: true,
      });
      onToast?.("Community alert created.");
      await loadAlerts();
    } catch (error) {
      onToast?.(error.response?.data?.message || "Failed to create community alert.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAlert = async (alert) => {
    try {
      await api.patch(`/alerts/community/${alert._id}`, {
        isActive: !alert.isActive,
      });
      onToast?.(`Alert ${!alert.isActive ? "activated" : "paused"}.`);
      await loadAlerts();
    } catch (error) {
      onToast?.(error.response?.data?.message || "Failed to update alert.");
    }
  };

  const deleteAlert = async (id) => {
    try {
      await api.delete(`/alerts/community/${id}`);
      onToast?.("Alert deleted.");
      await loadAlerts();
    } catch (error) {
      onToast?.(error.response?.data?.message || "Failed to delete alert.");
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <BellPlus className="h-5 w-5 text-blue-600" />
        <div>
          <h3 className="text-lg font-bold text-slate-900">Community Alerts</h3>
          <p className="text-sm text-slate-500">
            Create multiple admin alerts that appear in the active alert feed.
          </p>
        </div>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Flood Warning for North Zone"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            required
          />
          <input
            name="area"
            value={form.area}
            onChange={handleChange}
            placeholder="Dhaka North"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          >
            {typeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            name="severity"
            value={form.severity}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          >
            {severityOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            name="urgency"
            value={form.urgency}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          >
            {urgencyOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows="3"
          placeholder="River overflow expected near low-lying roads. Move resources to safer ground."
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          required
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="isActive"
            checked={form.isActive}
            onChange={handleChange}
          />
          Active immediately
        </label>

        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Create alert"}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Loading saved alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No saved community alerts yet.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert._id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{alert.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {alert.type} | {alert.severity} | {alert.urgency}
                    {alert.area ? ` | ${alert.area}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{alert.description}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAlert(alert)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white ${
                      alert.isActive ? "bg-amber-600" : "bg-emerald-600"
                    }`}
                  >
                    {alert.isActive ? "Pause" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAlert(alert._id)}
                    className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
