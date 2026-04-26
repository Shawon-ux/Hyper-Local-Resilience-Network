import { useEffect, useState } from "react";
import axios from "axios";

export default function Weather() {
  const [alerts, setAlerts] = useState([]);

  const fetchAlerts = () => {
    axios.get("http://localhost:5000/api/alerts")
      .then(res => setAlerts(res.data))
      .catch(() => setAlerts([]));
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleSimulate = () => {
    axios.post("http://localhost:5000/api/alerts/check", { simulate: true })
      .then(() => fetchAlerts())
      .catch(err => console.error(err));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Active Weather Alerts</h1>
          <p className="text-gray-400 mt-1">Live updates via OpenWeather API</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSimulate} className="px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-sm font-semibold hover:bg-brand/20 transition-all cursor-pointer">
            Simulate Storm
          </button>
          <div className="px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold flex items-center gap-2">
             <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Live Radar
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {alerts.length === 0 ? (
           <div className="bg-darkSurface border border-gray-800 rounded-2xl p-10 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                 <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                 </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Area is Clear</h2>
              <p className="text-gray-400">No severe weather systems currently detected.</p>
           </div>
        ) : alerts.map((alert, index) => (
          <div 
            key={index} 
            className="group bg-darkSurface hover:bg-gray-800/80 border border-red-500/20 transition-all duration-300 rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-orange-500"></div>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                   <h2 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">{alert.title}</h2>
                   <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-300">High Severity</span>
                </div>
                <p className="text-gray-300 leading-relaxed">{alert.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
