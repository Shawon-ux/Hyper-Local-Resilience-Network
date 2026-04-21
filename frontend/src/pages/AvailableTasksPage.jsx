import { useEffect, useState } from "react";
import { fetchAvailableTasks, acceptTask } from "../services/taskService";
import Layout from "../components/Layout";
import Panel from "../components/Panel";
import { MapPin, Clock, CheckCircle } from "lucide-react";

export default function AvailableTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const loadTasks = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAvailableTasks();
      setTasks(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load available tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleAccept = async (taskId) => {
    setProcessingId(taskId);
    setActionMessage("");
    setError("");
    try {
      await acceptTask(taskId);
      setActionMessage("Task accepted successfully! The resident has been notified.");
      await loadTasks();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to accept task.");
    } finally {
      setProcessingId(null);
    }
  };

  const urgencyStyles = {
    Low: "bg-slate-100 text-slate-800",
    Medium: "bg-sky-100 text-sky-800",
    High: "bg-orange-100 text-orange-800",
    Critical: "bg-rose-100 text-rose-800",
  };

  return (
    <Layout
      title="Available Community Tasks"
      subtitle="Browse and accept tasks from your neighbors who need help right now."
    >
      <div className="grid gap-6 lg:grid-cols-1">
        <Panel title="Open Tasks Near You">
          {actionMessage && (
            <div className="mb-6 rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {actionMessage}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500">Loading available tasks...</p>
          ) : tasks.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 p-6 text-center">
              <p className="text-slate-600">
                There are currently no open tasks available in your area. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {tasks.map((task) => (
                <div
                  key={task._id}
                  className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {task.title}
                      </h3>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          urgencyStyles[task.urgency] || urgencyStyles.Medium
                        }`}
                      >
                        {task.urgency || "Medium"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {task.description}
                    </p>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <span>
                          {task.location?.lat?.toFixed(4)},{" "}
                          {task.location?.lng?.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span>
                          Posted on {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Requested by</p>
                      <p className="text-sm font-medium text-slate-800">
                        {task.postedBy?.name || "Neighbor"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAccept(task._id)}
                      disabled={processingId === task._id}
                      className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {processingId === task._id ? "Accepting..." : "Accept Task"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </Layout>
  );
}
