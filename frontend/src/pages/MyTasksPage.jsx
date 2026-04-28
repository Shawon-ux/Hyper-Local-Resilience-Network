import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  fetchMyTasks,
  updateMyTask,
  deleteMyTask,
  completeTask,
} from "../services/taskService";
import { MapPin, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import SuggestedHelpers from "../components/SuggestedHelpers";
import { useAuth } from "../context/AuthContext";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
  autoConnect: false,
});

const MyTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingTaskId, setEditingTaskId] = useState("");
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    urgency: "Medium",
  });
  const [taskStatus, setTaskStatus] = useState("");
  const [savingTaskId, setSavingTaskId] = useState("");

  const loadTasks = async () => {
    try {
      const data = await fetchMyTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load your tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (!user?._id) {
      socket.disconnect();
      return;
    }

    socket.connect();
    socket.emit("register:user", user._id);
    socket.emit("register", user._id);

    // Listen for task updates from other users (e.g., when someone accepts the task)
    const handleTasksUpdated = () => {
      loadTasks();
    };

    socket.on("task:updated", handleTasksUpdated);
    socket.on("notification", handleTasksUpdated);
    socket.on("notification:new", handleTasksUpdated);
    window.addEventListener("taskUpdated", handleTasksUpdated);

    return () => {
      socket.off("task:updated", handleTasksUpdated);
      socket.off("notification", handleTasksUpdated);
      socket.off("notification:new", handleTasksUpdated);
      window.removeEventListener("taskUpdated", handleTasksUpdated);
    };
  }, [user?._id]);

  const startEditing = (task) => {
    setEditingTaskId(task._id);
    setEditData({
      title: task.title || "",
      description: task.description || "",
      urgency: task.urgency || "Medium",
    });
    setTaskStatus("");
  };

  const cancelEditing = () => {
    setEditingTaskId("");
    setTaskStatus("");
  };

  const handleEditChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const saveTaskEdit = async (taskId) => {
    setTaskStatus("");
    setSavingTaskId(taskId);

    try {
      const updated = await updateMyTask(taskId, editData);
      setTasks((prev) =>
        prev.map((task) => (task._id === taskId ? updated : task)),
      );
      setTaskStatus("Task updated successfully.");
      setEditingTaskId("");
    } catch (err) {
      setTaskStatus(err?.response?.data?.message || "Unable to update task.");
    } finally {
      setSavingTaskId("");
    }
  };

  const removeTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    setTaskStatus("");
    setSavingTaskId(taskId);

    try {
      await deleteMyTask(taskId);
      setTasks((prev) => prev.filter((task) => task._id !== taskId));
      setTaskStatus("Task deleted successfully.");
      if (editingTaskId === taskId) {
        cancelEditing();
      }
    } catch (err) {
      setTaskStatus(err?.response?.data?.message || "Unable to delete task.");
    } finally {
      setSavingTaskId("");
    }
  };

  const handleComplete = async (taskId) => {
    try {
      await completeTask(taskId);
      loadTasks(); // refresh to show updated status
    } catch (err) {
      alert(
        "Failed to complete task: " +
          (err.response?.data?.message || err.message),
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">
                Your Posted Tasks
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Review the micro-tasks you’ve posted and manage them directly
                from here.
              </p>
            </div>
            <Link
              to="/tasks/new"
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Post another task
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200 text-slate-600">
            Loading your tasks...
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-rose-50 p-8 shadow-lg ring-1 ring-slate-200 text-rose-700">
            {error}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-slate-700">
                <Sparkles className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold">No tasks posted yet</h2>
              </div>
              <p className="text-sm text-slate-600">
                Create your first micro-task to get AI-suggested skills and
                connect with helpers nearby.
              </p>
              <Link
                to="/tasks/new"
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Post a micro-task
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {tasks
              .filter((t) => t.status !== "completed")
              .map((task) => {
                const isEditing = editingTaskId === task._id;

                return (
                  <div
                    key={task._id}
                    className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                          {task.title}
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                          {task.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2 font-semibold">
                        Real-time Status
                      </p>
                      <div className="flex items-center justify-between text-xs sm:text-sm font-medium mb-2">
                        <span
                          className={
                            task.status === "open"
                              ? "text-blue-600"
                              : "text-slate-500"
                          }
                        >
                          Searching
                        </span>
                        <span
                          className={
                            task.status === "in-progress"
                              ? "text-amber-600"
                              : "text-slate-500"
                          }
                        >
                          Assigned{" "}
                          {task.helper?.name ? `(${task.helper.name})` : ""}
                        </span>
                        <span
                          className={
                            task.status === "completed"
                              ? "text-green-600"
                              : "text-slate-500"
                          }
                        >
                          Completed
                        </span>
                      </div>
                      <div className="h-2 flex rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            task.status === "open"
                              ? "w-1/3 bg-blue-500"
                              : task.status === "in-progress"
                                ? "w-2/3 bg-amber-500"
                                : task.status === "completed"
                                  ? "w-full bg-green-500"
                                  : "w-0"
                          }`}
                        ></div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Urgency
                        </p>
                        <p className="text-sm font-medium text-slate-800">
                          {task.urgency || "Medium"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Location
                        </p>
                        <p className="text-sm text-slate-800 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          {task.location?.lat?.toFixed(4)},{" "}
                          {task.location?.lng?.toFixed(4)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Posted
                        </p>
                        <p className="text-sm text-slate-800">
                          {new Date(task.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {Array.isArray(task.selectedSkills) &&
                      task.selectedSkills.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Chosen tags
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {task.selectedSkills.map((skill) => (
                              <span
                                key={`selected-${skill}`}
                                className="rounded-full bg-blue-500 px-3 py-1 text-sm font-medium text-white"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    {Array.isArray(task.suggestedSkills) &&
                      task.suggestedSkills.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            AI suggested skills
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {task.suggestedSkills.map((skill) => (
                              <span
                                key={`suggested-${skill}`}
                                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      {task.status === "in-progress" && (
                        <button
                          type="button"
                          onClick={() => handleComplete(task._id)}
                          className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Mark Completed
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          isEditing ? cancelEditing() : startEditing(task)
                        }
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-700"
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTask(task._id)}
                        className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>

                    {!isEditing && <SuggestedHelpers taskId={task._id} />}

                    {isEditing && (
                      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <h3 className="text-lg font-semibold text-slate-900">
                          Edit task
                        </h3>
                        <div className="mt-4 grid gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700">
                              Title
                            </label>
                            <input
                              value={editData.title}
                              onChange={(e) =>
                                handleEditChange("title", e.target.value)
                              }
                              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700">
                              Description
                            </label>
                            <textarea
                              rows={4}
                              value={editData.description}
                              onChange={(e) =>
                                handleEditChange("description", e.target.value)
                              }
                              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700">
                              Urgency
                            </label>
                            <select
                              value={editData.urgency}
                              onChange={(e) =>
                                handleEditChange("urgency", e.target.value)
                              }
                              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                              {["Low", "Medium", "High", "Critical"].map(
                                (level) => (
                                  <option key={level} value={level}>
                                    {level}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => saveTaskEdit(task._id)}
                            disabled={savingTaskId === task._id}
                            className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                          >
                            {savingTaskId === task._id
                              ? "Saving..."
                              : "Save changes"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-700"
                          >
                            Cancel
                          </button>
                        </div>

                        {taskStatus && (
                          <p className="mt-3 text-sm text-slate-700">
                            {taskStatus}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTasksPage;
