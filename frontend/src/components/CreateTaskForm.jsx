import { useState, useEffect } from "react";
import useDebounce from "../hooks/useDebounce";
import { useAuth } from "../context/AuthContext";
import {
  analyzeTaskDescription,
  createMicroTask,
} from "../services/taskService";
import Toast from "./Toast";

const urgencyOptions = ["Low", "Medium", "High", "Critical"];

const CreateTaskForm = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("Medium");
  const [location, setLocation] = useState("");
  const [locationSource, setLocationSource] = useState("profile");
  const [geoStatus, setGeoStatus] = useState("");
  const [suggestedSkills, setSuggestedSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState("");
  const [analysisIntent, setAnalysisIntent] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [debouncedDescription] = useDebounce(description, 550);

  useEffect(() => {
    const analyze = async () => {
      if (!debouncedDescription.trim()) {
        setSuggestedSkills([]);
        setAnalysisIntent("");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result = await analyzeTaskDescription(debouncedDescription);
        setSuggestedSkills(Array.isArray(result.skills) ? result.skills : []);
        setAnalysisIntent(result.intent || "");
      } catch (err) {
        setError("Unable to analyze description. Please try again.");
        setSuggestedSkills([]);
        setAnalysisIntent("");
      } finally {
        setLoading(false);
      }
    };

    analyze();
  }, [debouncedDescription]);

  useEffect(() => {
    if (user?.location) {
      setLocation(user.location);
      setLocationSource("profile");
    }
  }, [user?.location]);

  const handleUseProfileLocation = () => {
    if (user?.location) {
      setLocation(user.location);
      setLocationSource("profile");
      setError("");
    } else {
      setError("Your profile location is not available.");
    }
  };



  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((item) => item !== skill)
        : [...prev, skill],
    );
  };

  const handleAddCustomSkill = () => {
    const normalized = customSkill.trim();
    if (!normalized) {
      return;
    }

    if (selectedSkills.includes(normalized)) {
      setCustomSkill("");
      return;
    }

    setSelectedSkills((prev) => [...prev, normalized]);
    setCustomSkill("");
  };

  const handleCustomSkillKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddCustomSkill();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFeedback("");

    if (
      !title.trim() ||
      !description.trim() ||
      !location.trim()
    ) {
      setError("Please enter title, description, and select a location.");
      return;
    }

    setLoading(true);

    try {
      await createMicroTask({
        title,
        description,
        urgency,
        location,
        selectedSkills,
      });

      setFeedback("Task posted successfully.");
      setTitle("");
      setDescription("");
      setUrgency("Medium");
      setLocation("");
      setLocationSource("profile");
      setSelectedSkills([]);
      setCustomSkill("");
      setSuggestedSkills([]);
      setAnalysisIntent("");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to post task.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">
          Post a micro-task
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Describe your non-emergency request and get AI-powered skill
          suggestions for faster matching.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Task Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Need help jump-starting my car"
            className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="My car won't start and I need a neighbor to help jump-start it."
            className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Task location
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Choose your saved profile location or request your current
                browser location.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleUseProfileLocation}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm hover:border-blue-500 hover:text-blue-700"
              >
                Use profile location
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-700">
                Selected coordinates
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {locationSource === "current"
                  ? "Current location"
                  : "Profile location"}
              </span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-800">
              <span className="block text-xs text-slate-500">Location</span>
              <span>
                {location || "Not selected"}
              </span>
            </div>
            {geoStatus && <p className="text-sm text-slate-600">{geoStatus}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Urgency
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {urgencyOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* <div className="flex flex-col justify-end">
            <p className="text-sm text-slate-500">
              AI analysis updates automatically after you stop typing.
            </p>
          </div> */}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              AI-Suggested Skills
            </label>
            {analysisIntent && (
              <span className="text-sm text-slate-500">
                Intent: {analysisIntent}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {loading && debouncedDescription ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                Analyzing...
              </span>
            ) : suggestedSkills.length > 0 ? (
              suggestedSkills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    selectedSkills.includes(skill)
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-blue-500"
                  }`}
                >
                  {skill}
                </button>
              ))
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                Enter a task description to see suggested skills.
              </span>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-slate-700">
                Add your own skill tags
              </label>
              <span className="text-sm text-slate-500">
                If the AI misses something, add it here.
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={handleCustomSkillKeyDown}
                placeholder="e.g. Electrical repair"
                className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={handleAddCustomSkill}
                className="rounded-2xl border border-blue-600 bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Add tag
              </button>
            </div>
          </div>
        </div>

        {selectedSkills.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">
              Selected skills
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSkills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
                >
                  <span>{skill}</span>
                  <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs text-blue-700">
                    ×
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Posting..." : "Post Micro-Task"}
          </button>
        </div>
      </form>

      <Toast message={feedback} />
    </div>
  );
};

export default CreateTaskForm;
