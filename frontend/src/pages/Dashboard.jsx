import { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [data, setData] = useState({});

  useEffect(() => {
    axios.get("http://localhost:5000/api/dashboard/summary")
      .then((res) => setData(res.data))
      .catch(() => setData({}));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Community Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-green-300 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold">Safe Users</h2>
          <p className="text-2xl">{data.safeUsers || 0}</p>
        </div>

        <div className="bg-red-300 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold">Active Alerts</h2>
          <p className="text-2xl">{data.alerts || 0}</p>
        </div>

        <div className="bg-blue-300 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold">Resources</h2>
          <p className="text-2xl">{data.resources || 0}</p>
        </div>
      </div>
    </div>
  );
}