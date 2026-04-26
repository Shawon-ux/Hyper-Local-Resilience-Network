import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { AlertTriangle, BellRing } from 'lucide-react'; // Optional icons

const DemandForecast = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial fetch
    const fetchData = async () => {
      try {
        const res = await axios.get('http://localhost:9457/api/resources');
        setResources(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching resources:", err);
        setLoading(false);
      }
    };
    fetchData();

    // 2. Real-time changes (Feature 2 & 3)
    const socket = io('http://localhost:9457');
    socket.on('resourceUpdate', (data) => {
      setResources(data);
    });

    return () => socket.disconnect();
  }, []);

  if (loading) return <div className="p-4 text-center text-slate-500">Loading forecast data...</div>;

  return (
    <div className="space-y-6">
      {/* FEATURE 4: Moderator / Community Stress Points */}
      {resources.filter(r => (r.totalStock - r.consumed) / r.totalStock <= 0.3).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-red-700 font-bold text-sm flex items-center gap-2 mb-3">
            <AlertTriangle size={18} /> CRITICAL RESOURCE GAPS (STRESS POINTS)
          </h3>
          <div className="flex flex-wrap gap-3">
            {resources.filter(r => (r.totalStock - r.consumed) / r.totalStock <= 0.3).map(r => (
              <div key={r._id} className="bg-white px-3 py-1.5 rounded-lg border border-red-100 text-xs shadow-sm">
                <span className="font-bold text-red-600 uppercase">{r.name}:</span> 
                <span className="ml-1 text-slate-700">Only {r.totalStock - r.consumed} {r.unit} left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FEATURE 1 & 2: Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.length > 0 ? (
          resources.map((res) => {
            const remaining = res.totalStock - res.consumed;
            const percent = (remaining / res.totalStock) * 100;
            
            // Status Logic
            let status = "Low"; 
            let color = "bg-green-500";
            let textColor = "text-green-700";
            let bgColor = "bg-green-100";

            if (percent <= 20) { 
              status = "High"; color = "bg-red-500"; textColor = "text-red-700"; bgColor = "bg-red-100";
            } else if (percent <= 50) { 
              status = "Medium"; color = "bg-yellow-500"; textColor = "text-yellow-700"; bgColor = "bg-yellow-100";
            }

            return (
              <div key={res._id} className="border border-slate-100 p-5 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 capitalize leading-tight">{res.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{res.unit}</p>
                  </div>
                  <span className={`${bgColor} ${textColor} px-3 py-1 rounded-full text-[10px] uppercase font-black border border-current`}>
                    {status} Demand
                  </span>
                </div>
                
                <div className="flex justify-between items-end mb-1 text-xs">
                  <span className="text-slate-500 font-medium">Stock: {remaining} / {res.totalStock}</span>
                  <span className="text-slate-800 font-bold">{Math.round(percent)}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${color} transition-all duration-1000 ease-out`} 
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>

                {/* FEATURE 3: Proactive Notification "Helper" link (Optional UI) */}
                {percent <= 20 && (
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-red-500 font-bold animate-pulse">
                    <BellRing size={12} /> PROACTIVE ALERT SENT TO HELPERS
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-2 text-center py-10 border-2 border-dashed rounded-2xl text-slate-400">
            No live demand forecast available. Start by adding resources to the database.
          </div>
        )}
      </div>
    </div>
  );
};

export default DemandForecast;