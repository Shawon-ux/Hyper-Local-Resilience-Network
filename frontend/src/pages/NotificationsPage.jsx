import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';
import Panel from '../components/Panel';
import Toast from '../components/Toast';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(window.__notificationsToastTimer);
    window.__notificationsToastTimer = window.setTimeout(() => setToast(''), 3000);
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications/my');
      setNotifications(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications.');
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      await fetchNotifications();
      setLoading(false);
    };

    if (user) {
      load();
    }
  }, [user]);

  const markNotificationRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      showToast('Notification marked read.');
      await fetchNotifications();
      window.dispatchEvent(new Event('notificationsRead'));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update notification.');
    }
  };

  return (
    <Layout
      title="Notifications"
      subtitle="View your community notifications in one place. Mark them read when you’ve seen them."
    >
      {toast && <Toast message={toast} />}

      <div className="space-y-6">
        <Panel title="Your notifications">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Loading notifications...
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
                    item.isRead
                      ? 'border-slate-200 bg-white'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Bell className="mt-0.5 h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.message}</p>
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
