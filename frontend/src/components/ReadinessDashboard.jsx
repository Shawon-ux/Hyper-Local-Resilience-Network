import { useState } from "react";
import {
  AlertTriangle,
  BellRing,
  ShieldAlert,
  Users,
} from "lucide-react";
import api from "../services/api";

const severityClasses = {
  Critical: "bg-red-500",
  Stressed: "bg-amber-500",
  Stable: "bg-emerald-500",
};

export default function ReadinessDashboard({
  data,
  loading,
  location,
  alerts = [],
  canNotify = false,
  onOutreachSent,
}) {
  const [sendingCategory, setSendingCategory] = useState("");
  const [actionError, setActionError] = useState("");

  if (loading) {
    return <div className="animate-pulse rounded-3xl bg-slate-100 p-8 h-72" />;
  }

  if (!data) return null;

  const sendOutreach = async (category) => {
    try {
      setSendingCategory(category);
      setActionError("");

      const response = await api.post("/readiness/outreach", {
        lat: Number(location.lat),
        lng: Number(location.lng),
        category,
      });

      onOutreachSent?.(response.data.message);
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Failed to notify relevant community members."
      );
    } finally {
      setSendingCategory("");
    }
  };

  const topStressPoint = data.summary?.topStressPoint;
  const criticalRows = data.analysis.filter((item) => item.severity === "Critical");
  const stressRows = data.analysis.filter((item) => item.severity !== "Stable");

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="flex flex-col gap-4 bg-slate-950 p-6 text-white md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-300">
            Moderator Readiness Dashboard
          </p>
          <h2 className="mt-2 flex items-center gap-2 text-2xl font-black">
            <ShieldAlert className="h-6 w-6 text-red-400" />
            Resource gaps before impact
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            This view compares predicted demand from active alerts against current community supply and shows who can be prompted to pre-offer help.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:min-w-[260px]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Readiness
            </p>
            <p className="mt-1 text-3xl font-black">{data.summary?.averageReadiness ?? 0}%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Active Alerts
            </p>
            <p className="mt-1 text-3xl font-black">{alerts.length}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Demand</th>
                  <th className="px-4 py-3">Supply</th>
                  <th className="px-4 py-3">Gap</th>
                  <th className="px-4 py-3">Readiness</th>
                </tr>
              </thead>
              <tbody>
                {data.analysis.map((item) => (
                  <tr key={item.category} className="border-t border-slate-100">
                    <td className="px-4 py-4 font-bold capitalize text-slate-900">
                      {item.category}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{item.demand}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{item.supply}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">{item.gap}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full ${severityClasses[item.severity]}`}
                            style={{ width: `${Math.min(item.readinessScore, 100)}%` }}
                          />
                        </div>
                        <span className="w-16 text-sm font-black text-slate-800">
                          {item.readinessScore}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-red-700">
                Immediate Stress Point
              </p>
              <p className="mt-2 text-lg font-black capitalize text-slate-900">
                {topStressPoint?.category || "No critical gap"}
              </p>
              <p className="mt-2 text-sm text-red-800">
                {topStressPoint
                  ? `Predicted shortfall of ${topStressPoint.gap} units before the crisis fully hits.`
                  : "Current signals do not show a critical gap."}
              </p>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-blue-700">
                Proactive Outreach Window
              </p>
              <p className="mt-2 text-sm text-blue-900">
                {stressRows.length
                  ? `${stressRows.length} resource categories should be watched now so helpers can list support before requests spike.`
                  : "No outreach needed right now, but the system will keep tracking readiness."}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
              Suggested Provider Outreach
            </h3>
          </div>

          {stressRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              No resource gap currently needs proactive outreach.
            </div>
          ) : (
            <div className="space-y-3">
              {stressRows.map((item) => {
                const target = data.proactiveTargets?.find(
                  (entry) => entry.category === item.category
                );

                return (
                  <div
                    key={item.category}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black capitalize text-slate-900">
                            {item.category}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase text-slate-600">
                            Gap {item.gap}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {target?.providerCount
                            ? `${target.providerCount} member(s) already listed matching resources.`
                            : "No matching pre-listed providers found for this category yet."}
                        </p>
                        {!!target?.providers?.length && (
                          <p className="mt-2 text-xs text-slate-500">
                            {target.providers
                              .slice(0, 3)
                              .map((provider) => provider.name)
                              .join(", ")}
                            {target.providers.length > 3 ? " and more" : ""}
                          </p>
                        )}
                      </div>

                      {canNotify && target?.providerCount > 0 && (
                        <button
                          type="button"
                          onClick={() => sendOutreach(item.category)}
                          disabled={sendingCategory === item.category}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          <BellRing className="h-4 w-4" />
                          {sendingCategory === item.category
                            ? "Sending..."
                            : "Notify relevant members"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {(criticalRows.length > 0 || actionError) && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <p className="font-semibold text-amber-900">
                  {actionError || "Critical categories should be escalated first."}
                </p>
                {!actionError && (
                  <p className="mt-1 text-sm text-amber-800">
                    Start with {criticalRows.map((item) => item.category).join(", ")} because those categories have the lowest readiness score.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
