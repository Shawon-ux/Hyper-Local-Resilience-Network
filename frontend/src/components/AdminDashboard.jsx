import React, { useEffect, useState } from "react";
import api from "../services/api";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/resources/moderator-stats").then((res) => setStats(res.data));
  }, []);

  if (!stats) return <p>Loading Admin Intelligence...</p>;

  return (
    <div className="p-6 bg-slate-50 rounded-3xl">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">
        Resource Readiness Dashboard
      </h2>

      {/* READINESS GAUGE */}
      <div className="bg-white p-8 rounded-2xl shadow-sm mb-6 text-center">
        <div className="text-5xl font-black text-blue-600">
          {stats.readinessScore}%
        </div>
        <p className="text-slate-500 uppercase tracking-widest text-xs mt-2 font-bold">
          Community Readiness Score
        </p>
      </div>

      {/* STRESS POINTS */}
      <div className="grid gap-4">
        <h3 className="font-bold text-red-600 flex items-center gap-2">
          ⚠️ Potential Stress Points
        </h3>
        {stats.stressPoints.map((item) => (
          <div
            key={item._id}
            className="bg-red-50 border border-red-100 p-4 rounded-xl flex justify-between items-center"
          >
            <div>
              <span className="font-bold capitalize">{item.name}</span>
              <p className="text-xs text-red-500 font-medium">
                Predicted gap: {item.totalStock - item.consumed} {item.unit}{" "}
                left
              </p>
            </div>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">
              Notify Providers
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
