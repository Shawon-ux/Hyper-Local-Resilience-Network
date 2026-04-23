import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Bell, Siren, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Layout from "../components/Layout";
import Panel from "../components/Panel";
import Toast from "../components/Toast";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:9457", {
  autoConnect: false,
});

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(window.__notificationsToastTimer);
    window.__notificationsToastTimer = window.setTimeout(() => setToast(""), 3000);
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/notifications/my");
      setNotifications(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications.");
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      await fetchNotifications();
      setLoading(false);
    };

    if (user) {
      load();
    }
  }, [user]);

  useEffect(() => {
    if (!user?._id) {
      socket.disconnect();
      return;
    }

    socket.connect();
    socket.emit("register:user", user._id);

    const handleIncoming = () => {
      fetchNotifications();
    };

    socket.on("notification:new", handleIncoming);

    return () => {
      socket.off("notification:new", handleIncoming);
    };
  }, [user?._id]);

  const markNotificationRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      window.dispatchEvent(new Event("notifications:changed"));
      showToast("Notification marked read.");
      await fetchNotifications();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update notification.");
    }
  };

  const getIcon = (type) => {
    if (type === "PROACTIVE_RESOURCE_READINESS") {
      return <Users className="mt-0.5 h-5 w-5 text-amber-600" />;
    }

    if (type === "READINESS_GAP_ALERT") {
      return <Siren className="mt-0.5 h-5 w-5 text-red-600" />;
    }

    return <Bell className="mt-0.5 h-5 w-5 text-blue-600" />;
  };

  return (
    <Layout
      title="Notifications"
      subtitle="View your community notifications in one place. Mark them read when you've seen them."
    >
      {toast && <Toast message={toast} />}

      <div className="space-y-6">
        <Panel title="Your notifications">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Loading notifications...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No notifications yet.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => markNotificationRead(item._id)}
                  className={`w-full rounded-2xl border p-4 text-left ${
                    item.isRead ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(item.type)}
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                      {item.meta?.resourceCategory && (
                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                          Related resource: {item.meta.resourceCategory}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </Layout>
  );
}
