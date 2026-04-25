import { useEffect, useState } from "react";
import { getAlerts } from "./services/api";

export default function WeatherAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    getAlerts()
      .then(res => setAlerts(res.data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold">Weather Alerts</h1>

      {alerts.map((alert, i) => (
        <div key={i} className="bg-red-200 p-4 mt-3 rounded">
          {alert.title}
        </div>
      ))}
    </div>
  );
}