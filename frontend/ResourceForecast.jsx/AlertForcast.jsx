import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("http://localhost:9457");

export default function ResourceForecast() {
  const [data, setData] = useState([]);

  const load = async () => {
    const res = await axios.get(
      "/api/resources/forecast/summary"
    );
    setData(res.data);
  };

  useEffect(() => {
    load();

    socket.on("forecastUpdated", () => {
      load();
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Resource Demand Forecast
      </h2>

      {data.map((r, i) => (
        <div key={i} className="border p-3 mb-3 rounded">
          <h3 className="font-bold">
            {r.resourceName} ({r.unit})
          </h3>

          <p>Total: {r.total}</p>
          <p>Used: {r.used}</p>
          <p>Remaining: {r.remaining}</p>

          {/* progress */}
          <div className="w-full bg-gray-200 h-3 mt-2 rounded">
            <div
              className="bg-blue-500 h-3"
              style={{ width: `${r.percentage}%` }}
            />
          </div>

          {/* status */}
          <div className="mt-2">
            <span
              className={`px-2 py-1 text-white rounded ${
                r.status === "High"
                  ? "bg-red-500"
                  : r.status === "Medium"
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
            >
              {r.status} Demand
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}