import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { AlertTriangle, Siren } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
  autoConnect: false,
});

const severityClasses = {
  Low: "border-amber-200 bg-amber-50 text-amber-900",
  Medium: "border-orange-200 bg-orange-50 text-orange-900",
  High: "border-red-200 bg-red-50 text-red-900",
  Critical: "border-red-300 bg-red-100 text-red-950",
};

export default function EmergencyBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);

  const loadStatus = async () => {
    if (!user) {
      setStatus(null);
      return;
    }

    try {
      const { data } = await api.get("/resources/emergency/status");
      setStatus(data);
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) {
      socket.disconnect();
      return;
    }

    socket.connect();
    const handleStatusChange = (nextStatus) => {
      setStatus(nextStatus);
    };

    socket.on("EMERGENCY_STATUS_CHANGE", handleStatusChange);
    return () => {
      socket.off("EMERGENCY_STATUS_CHANGE", handleStatusChange);
    };
  }, [user?._id]);

  if (!user || !status?.isActive) return null;

  return (
    <div
      className={`border-b ${severityClasses[status.severity] || severityClasses.High}`}
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Siren className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold uppercase tracking-wide">
            Emergency Mode Active: {status.type} in {status.area || "your area"}
          </p>
          <p className="text-sm">
            {status.message ||
              "A moderator has activated emergency mode. Please review alerts and update your safety status."}
          </p>
        </div>
        <AlertTriangle className="ml-auto mt-0.5 h-5 w-5 shrink-0" />
      </div>
    </div>
  );
}
