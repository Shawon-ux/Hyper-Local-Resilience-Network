import { useEffect, useState } from "react";
import { BellRing, Shield, ShieldOff } from "lucide-react";
import api from "../services/api";

export default function AlertUsersPanel({ onToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/readiness/alert-users");
      setUsers(data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load alert users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleStatus = async (userId, nextValue) => {
    try {
      setSavingId(userId);
      const { data } = await api.patch(`/readiness/alert-users/${userId}`, {
        isActive: nextValue,
      });
      setUsers((current) =>
        current.map((user) =>
          user._id === userId ? { ...user, crisisAlertActive: data.user.crisisAlertActive } : user
        )
      );
      onToast?.(data.message);
    } catch (err) {
      onToast?.(err.response?.data?.message || "Failed to update alert user.");
    } finally {
      setSavingId("");
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <BellRing className="h-5 w-5 text-blue-600" />
        <div>
          <h3 className="text-lg font-bold text-slate-900">Admin Alert Users</h3>
          <p className="text-sm text-slate-500">
            Enable or pause proactive crisis notifications for community members.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          Loading alert user controls...
        </div>
      ) : error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {users.map((member) => (
            <div
              key={member._id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {member.name} {member.isAdmin ? "(Admin)" : ""}
                </p>
                <p className="text-sm text-slate-500">
                  {member.email} • {member.phone}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Crisis alerts: {member.crisisAlertActive ? "Active" : "Paused"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => toggleStatus(member._id, !member.crisisAlertActive)}
                disabled={savingId === member._id}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white ${
                  member.crisisAlertActive ? "bg-rose-600" : "bg-emerald-600"
                } disabled:opacity-60`}
              >
                {member.crisisAlertActive ? (
                  <>
                    <ShieldOff className="h-4 w-4" />
                    Pause alerts
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Activate alerts
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
