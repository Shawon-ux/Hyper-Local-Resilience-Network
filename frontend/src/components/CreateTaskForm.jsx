import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import useDebounce from "../hooks/useDebounce";
import { useAuth } from "../context/AuthContext";
import {
  analyzeTaskDescription,
  createMicroTask,
} from "../services/taskService";
import {
  getAddressFromCoordinates,
  getCurrentLocationWithAddress,
} from "../services/geocodingService";
import Toast from "./Toast";

const urgencyOptions = ["Low", "Medium", "High", "Critical"];

const CreateTaskForm = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("Medium");
  
  // Location state: store both address (display) and coordinates (backend)
  const [locationAddress, setLocationAddress] = useState("");
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  const [locationSource, setLocationSource] = useState("profile");
  const [geoStatus, setGeoStatus] = useState("");
  
  const [suggestedSkills, setSuggestedSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState("");
  const [analysisIntent, setAnalysisIntent] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locatingGeo, setLocatingGeo] = useState(false);

  const [debouncedDescription] = useDebounce(description, 550);

  // Initialize with user's profile location
  useEffect(() => {
    if (user?.location?.lat && user?.location?.lng) {
      setLocationLat(user.location.lat);
      setLocationLng(user.location.lng);
      setLocationSource("profile");
      // Fetch and set the address
      getAddressFromCoordinates(user.location.lat, user.location.lng).then(
        (data) => {
          setLocationAddress(data.address);
        }
      );
    }
  }, [user?.location]);

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

  const handleUseProfileLocation = () => {
    if (user?.location?.lat && user?.location?.lng) {
      setLocationLat(user.location.lat);
      setLocationLng(user.location.lng);
      setLocationSource("profile");
      setError("");
      setGeoStatus("Loading address...");
      
      getAddressFromCoordinates(user.location.lat, user.location.lng).then(
        (data) => {
          setLocationAddress(data.address);
          setGeoStatus("");
        }
      ).catch((err) => {
        setGeoStatus("Could not fetch address");
      });
    } else {
      setError("Your profile location is not available.");
    }
  };

  const handleUseCurrentLocation = async () => {
    setLocatingGeo(true);
    setGeoStatus("Getting your current location...");
    setError("");
    
    try {
      const locationData = await getCurrentLocationWithAddress();
      setLocationLat(locationData.lat);
      setLocationLng(locationData.lng);
      setLocationAddress(locationData.address);
      setLocationSource("current");
      setGeoStatus("✓ Current location captured");
    } catch (err) {
      setError(err.message || "Unable to get your current location");
      setGeoStatus("");
    } finally {
      setLocatingGeo(false);
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

    if (!title.trim() || !description.trim()) {
      setError("Please enter title and description.");
      return;
    }

    if (!locationLat || !locationLng) {
      setError("Please select a location (profile or current).");
      return;
    }

    setLoading(true);

    try {
      await createMicroTask({
        title,
        description,
        urgency,
        location: {
          lat: locationLat,
          lng: locationLng,
          address: locationAddress,
        },
        selectedSkills,
      });

      setFeedback("Task posted successfully.");
      setTitle("");
      setDescription("");
      setUrgency("Medium");
      setLocationAddress("");
      setLocationLat(null);
      setLocationLng(null);
      setLocationSource("profile");
      setSelectedSkills([]);
      setCustomSkill("");
      setSuggestedSkills([]);
      setAnalysisIntent("");
      setGeoStatus("");
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

        {/* Location Section */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Task location
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Choose your saved profile location or get your current
                browser location. Address will be displayed automatically.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleUseProfileLocation}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm hover:border-blue-500 hover:text-blue-700 transition"
              >
                Use profile location
              </button>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locatingGeo}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm hover:border-blue-500 hover:text-blue-700 transition disabled:opacity-50"
              >
                {locatingGeo ? "Getting location..." : "Use current location"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-700">
                Selected location
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {locationSource === "current"
                  ? "Current location"
                  : "Profile location"}
              </span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-800">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="block text-xs text-slate-500 mb-1">Address</span>
                  <span className="block font-medium">
                    {locationAddress || "Not selected"}
                  </span>
                  {locationLat && locationLng && (
                    <span className="block text-xs text-slate-500 mt-1">
                      Coordinates: {locationLat.toFixed(4)}, {locationLng.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {geoStatus && (
              <p className={`text-sm ${geoStatus.includes("✓") ? "text-emerald-600" : "text-blue-600"}`}>
                {geoStatus}
              </p>
            )}
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
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSkills.map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-sm text-white flex items-center gap-2"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSkills((prev) =>
                        prev.filter((s, i) => i !== index)
                      )
                    }
                    className="text-white hover:text-blue-100"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={handleCustomSkillKeyDown}
                placeholder="Type a skill and press Enter"
                className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={handleAddCustomSkill}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm hover:border-blue-500 hover:text-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {feedback && <Toast message={feedback} type="success" />}

        <button
          type="submit"
          disabled={loading || locatingGeo}
          className="w-full rounded-2xl border border-blue-600 bg-blue-600 px-6 py-3 text-center text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post Task"}
        </button>
      </form>
    </div>
  );
};

export default CreateTaskForm;
