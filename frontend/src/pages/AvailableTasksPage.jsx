import { useEffect, useState, useMemo } from "react";
import { fetchAvailableTasks, acceptTask } from "../services/taskService";
import Layout from "../components/Layout";
import Panel from "../components/Panel";
import { MapPin, Clock, CheckCircle, Sparkles, Filter } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AvailableTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState("matching"); // 'matching' or 'general'

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

  const normalizeSkill = (s) => {
    if (!s) return "";
    return s.toLowerCase()
      .trim()
      .replace(/ing$/, '')
      .replace(/er$/, '')
      .replace(/s$/, '')
      .replace(/es$/, '');
  };

  const userSkills = useMemo(() => {
    const skillsSet = new Set();
    user?.skills?.forEach(s => {
      if (s.available !== false) {
        if (s.name) skillsSet.add(normalizeSkill(s.name));
        if (s.category) skillsSet.add(normalizeSkill(s.category));
      }
    });
    return Array.from(skillsSet);
  }, [user]);

  const filteredTasks = useMemo(() => {
    if (activeTab === "general") return tasks;
    
    return tasks.filter(task => {
      const taskSkills = [
        ...(task.suggestedSkills || []),
        ...(task.selectedSkills || [])
      ];
      if (taskSkills.length === 0) return false;
      return taskSkills.some(skill => userSkills.includes(normalizeSkill(skill)));
    });
  }, [tasks, activeTab, userSkills]);

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
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("matching")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "matching"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className={`h-4 w-4 ${activeTab === "matching" ? "text-blue-500" : "text-slate-400"}`} />
            Matches My Skills
          </button>
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "general"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Filter className={`h-4 w-4 ${activeTab === "general" ? "text-slate-900" : "text-slate-400"}`} />
            General
          </button>
        </div>

        <Panel title={activeTab === "matching" ? "Recommended for You" : "All Available Tasks"}>
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
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 p-6 text-center">
              <p className="text-slate-600">
                {activeTab === "matching" 
                  ? "No tasks match your current skills. Try the General tab or update your profile!" 
                  : "There are currently no open tasks available in your area."}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {filteredTasks.map((task) => (
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

                    {/* Skill Badges */}
                    {(() => {
                      const allTaskSkills = Array.from(new Set([
                        ...(task.suggestedSkills || []),
                        ...(task.selectedSkills || [])
                      ]));
                      
                      if (allTaskSkills.length === 0) return null;
                      
                      return (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {allTaskSkills.map(skill => {
                            const isMatch = userSkills.includes(normalizeSkill(skill));
                            return (
                              <span 
                                key={skill}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isMatch 
                                    ? "bg-blue-100 text-blue-700 border border-blue-200" 
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {skill}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}

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
