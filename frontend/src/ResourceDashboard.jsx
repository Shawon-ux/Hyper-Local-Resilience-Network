import { useEffect, useState } from "react";
import { getPredictions } from "./services/api";

export default function ResourceDashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    getPredictions()
      .then(res => setData(res.data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 mt-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Resource Readiness Predictions</h1>
          <p className="text-gray-400 mt-1">AI-driven demand forecasting based on local weather alerts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.length === 0 ? (
          <div className="col-span-full bg-darkSurface border border-gray-800 rounded-2xl p-10 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                 <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No Active Forecasts</h2>
              <p className="text-gray-400">Resource demand is currently stable.</p>
           </div>
        ) : data.map((d, i) => (
          <div key={i} className="group bg-darkSurface hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand/10 border border-gray-800/60 hover:border-brand/30 transition-all duration-300 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-brand/10 transition-colors"></div>
            
            <div className="flex items-center justify-between mb-4 relative">
               <div className="p-3 bg-gray-800/50 rounded-xl">
                 <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                 </svg>
               </div>
               <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                 d.level === 'high' || d.probability === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
               }`}>
                 {d.level || d.probability || 'High'} Demand
               </span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-1 capitalize relative">{d.resource}</h3>
            <p className="text-sm text-gray-400 mt-2 relative">Predicted surge in the next {d.timeframe || '6 hours'}</p>
            
            <button className="mt-6 w-full py-2.5 bg-brand/10 hover:bg-brand text-brand hover:text-white font-semibold rounded-xl transition-all duration-300 border border-brand/20 shadow-sm relative">
               Coordinate Supply
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}