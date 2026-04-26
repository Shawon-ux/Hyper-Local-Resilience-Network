import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { AlertTriangle, Activity, ShieldCheck } from "lucide-react";

const ReadinessDashboard = () => {
  const [data, setData] = useState({
    stressPoints: [],
    resourceGaps: [],
    overallReadiness: 0,
  });

  useEffect(() => {
    api.get("/resources/moderator-stats").then((res) => setData(res.data));
  }, []);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ShieldCheck className="text-blue-600" /> Resource Readiness Dashboard
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Community Readiness</p>
          <h2 className="text-3xl font-bold">
            {Math.round(data.overallReadiness)}%
          </h2>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
          <p className="text-sm text-gray-500">Critical Gaps</p>
          <h2 className="text-3xl font-bold text-red-600">
            {data.stressPoints.length}
          </h2>
        </div>
      </div>

      {/* Stress Points Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-100 font-bold flex items-center gap-2">
          <AlertTriangle className="text-orange-500 w-5 h-5" /> Potential Stress
          Points
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-sm text-gray-500 border-b">
              <th className="p-4">Resource</th>
              <th className="p-4">Current Gap</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.stressPoints.map((item) => (
              <tr key={item._id} className="border-b hover:bg-slate-50">
                <td className="p-4 font-medium capitalize">{item.name}</td>
                <td className="p-4 text-red-600 font-bold">
                  {item.totalStock - item.consumed} {item.unit} left
                </td>
                <td className="p-4">
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold uppercase">
                    CRITICAL
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
