import { useEffect, useState } from "react";
import { AlertTriangle, Siren } from "lucide-react";
import api from "../services/api";

const emergencyTypes = ["Flood", "Storm", "Earthquake", "Fire", "None"];
const severityLevels = ["Low", "Medium", "High", "Critical"];

export default function EmergencyControlPanel({ onToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    isActive: false,
    type: "Flood",
    area: "",
    severity: "High",
    message: "",
  });

  const loadEmergencyStatus = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/resources/emergency/status");
      setForm({
        isActive: Boolean(data?.isActive),
        type: data?.type || "Flood",
        area: data?.area || "",
        severity: data?.severity || "High",
        message: data?.message || "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load emergency status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmergencyStatus();
  }, []);

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
      setError("");
      const payload = {
        ...form,
        type: form.isActive ? form.type : "None",
        severity: form.isActive ? form.severity : "Low",
        message: form.isActive ? form.message : "",
      };
      const { data } = await api.post("/resources/emergency/toggle", payload);
      setForm({
        isActive: Boolean(data?.isActive),
        type: data?.type || "None",
        area: data?.area || "",
        severity: data?.severity || "Low",
        message: data?.message || "",
      });
      onToast?.(
        data?.isActive
          ? `Emergency mode activated for ${data.area || "selected area"}.`
          : "Emergency mode cleared."
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update emergency mode.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Siren className="h-5 w-5 text-red-600" />
        <div>
          <h3 className="text-lg font-bold text-slate-900">Emergency Mode Control</h3>
          <p className="text-sm text-slate-500">
            Admin can activate a live emergency alert for the whole platform.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          Loading emergency controls...
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
            <div>
              <p className="font-semibold text-slate-900">Activate emergency mode</p>
              <p className="text-sm text-slate-500">
                Turn this on when a flood or other crisis is actively affecting the area.
              </p>
            </div>
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
              className="h-5 w-5"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Emergency type</span>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                disabled={!form.isActive}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              >
                {emergencyTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Severity</span>
              <select
                name="severity"
                value={form.severity}
                onChange={handleChange}
                disabled={!form.isActive}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              >
                {severityLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Area</span>
              <input
                type="text"
                name="area"
                value={form.area}
                onChange={handleChange}
                placeholder="Dhaka South"
                disabled={!form.isActive}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Alert message</span>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows="3"
              placeholder="Flood water rising. Move to higher ground and confirm your status."
              disabled={!form.isActive}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white ${
              form.isActive ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800"
            } disabled:opacity-60`}
          >
            {saving
              ? "Saving..."
              : form.isActive
              ? "Activate emergency alert"
              : "Save emergency as inactive"}
          </button>
        </form>
      )}
    </section>
  );
}
