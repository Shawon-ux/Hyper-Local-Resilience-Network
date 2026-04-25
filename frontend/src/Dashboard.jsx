import { useEffect, useState } from "react";
import { getDashboard } from "../services/api";

export default function Dashboard() {
  const [data, setData] = useState({});

  useEffect(() => {
    getDashboard()
      .then(res => setData(res.data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="bg-green-300 p-5 rounded-xl shadow-lg">Safe Users: {data.safeUsers}</div>
        <div className="bg-red-200 p-4">Alerts: {data.alerts}</div>
        <div className="bg-blue-200 p-4">Resources: {data.resources}</div>
      </div>
    </div>
  );
}