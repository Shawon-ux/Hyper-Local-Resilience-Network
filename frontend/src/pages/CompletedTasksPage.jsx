import { useEffect, useState } from "react";
import { fetchMyTasks } from "../services/taskService";
import { MapPin, CheckCircle, Award } from "lucide-react";
import Layout from "../components/Layout";
import Panel from "../components/Panel";
import VouchModal from "../components/VouchModal";

export default function CompletedTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTaskForVouch, setSelectedTaskForVouch] = useState(null);

  const loadTasks = async () => {
    try {
      const data = await fetchMyTasks();
      const completed = Array.isArray(data)
        ? data.filter((t) => t.status === "completed")
        : [];
      setTasks(completed);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to load completed tasks.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleVouchSuccess = () => {
    loadTasks();
  };

  return (
    <Layout
      title="Completed Tasks"
      subtitle="History of tasks you have posted and were successfully completed."
    >
      <div className="space-y-6">
        <Panel title="Mission Accomplished">
          {loading ? (
            <p className="text-sm text-slate-500">Loading history...</p>
          ) : error ? (
            <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 p-6 text-center">
              <p className="text-slate-600">No completed tasks found.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {tasks.map((task) => (
                <div
                  key={task._id}
                  className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200 border-l-4 border-emerald-500"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {task.title}
                    </h3>
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                    {task.description}
                  </p>

                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {task.location?.lat?.toFixed(2)},{" "}
                      {task.location?.lng?.toFixed(2)}
                    </div>
                    <div>
                      Completed on{" "}
                      {new Date(task.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {task.helper && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Helper
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {task.helper.name}
                      </p>

                      {!task.vouched && (
                        <button
                          onClick={() => setSelectedTaskForVouch(task)}
                          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Award className="w-4 h-4" />
                          Rate & Verify
                        </button>
                      )}

                      {task.vouched && (
                        <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Vouched
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {selectedTaskForVouch && (
        <VouchModal
          task={selectedTaskForVouch}
          helper={selectedTaskForVouch.helper}
          onClose={() => setSelectedTaskForVouch(null)}
          onSuccess={() => handleVouchSuccess(selectedTaskForVouch._id)}
        />
      )}
    </Layout>
  );
}
