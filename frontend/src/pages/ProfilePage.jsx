import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  Zap,
  Clock3,
  UserCheck,
  Search,
  ChevronDown,
  Download,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  fetchProfile,
  saveProfile,
  bulkUpdateSkills,
} from "../services/profileService";

const CATEGORIES = [
  "General",
  "Plumbing",
  "First Aid",
  "Electrical",
  "EV",
  "Construction",
  "Community Care",
];

const LEVEL_OPTIONS = [
  { value: "all", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "expert", label: "Expert" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "experience", label: "Highest Experience" },
  { value: "alpha", label: "Alphabetical" },
];

const AVAILABILITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "unavailable", label: "Unavailable" },
];

const formatRelativeTime = (dateValue) => {
  if (!dateValue) return "Unknown";
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
};

const availabilityLabel = (available) =>
  available ? "Available" : "Unavailable";
const availabilityStyle = (available) =>
  available
    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : "bg-rose-100 text-rose-800 border-rose-200";
const getSkillId = (skill, index) => {
  if (skill._id) return String(skill._id);
  if (skill.id) return String(skill.id);
  return `${skill.name || "skill"}-${index}`;
};
const createBlankForm = () => ({
  _id: "",
  name: "",
  category: "General",
  level: "intermediate",
  available: true,
  yearsOfExperience: 0,
  hourlyRate: 0,
  lastVerified: new Date().toISOString().slice(0, 10),
});

const ProfilePage = () => {
  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState(createBlankForm());
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    category: "all",
    level: "all",
    availability: "all",
    sortBy: "recent",
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmState, setConfirmState] = useState({
    open: false,
    mode: "single",
    label: "",
    ids: [],
  });
  const rollbackRef = useRef([]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(searchTerm.trim().toLowerCase()),
      300,
    );
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await fetchProfile();
        setSkills(Array.isArray(data.skills) ? data.skills : []);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load your skill profile.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim() || form.name.trim().length < 3) {
      nextErrors.name = "Skill name must be at least 3 characters.";
    }

    const duplicate = skills.some((skill, index) => {
      const skillId = getSkillId(skill, index);
      return (
        (skill.name || "").trim().toLowerCase() ===
          form.name.trim().toLowerCase() && skillId !== form._id
      );
    });

    if (duplicate) {
      nextErrors.name = "A skill with that name already exists.";
    }

    if (!form.category) {
      nextErrors.category = "Please select a category.";
    }

    if (
      Number(form.yearsOfExperience) < 0 ||
      Number.isNaN(Number(form.yearsOfExperience))
    ) {
      nextErrors.yearsOfExperience =
        "Years of experience must be a positive number.";
    }

    if (Number(form.hourlyRate) < 0 || Number.isNaN(Number(form.hourlyRate))) {
      nextErrors.hourlyRate = "Hourly rate must be a valid number.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const counts = useMemo(() => {
    const total = skills.length;
    const available = skills.filter((skill) => skill.available).length;
    const offline = total - available;
    const beginner = skills.filter(
      (skill) => skill.level === "beginner",
    ).length;
    const intermediate = skills.filter(
      (skill) => skill.level === "intermediate",
    ).length;
    const expert = skills.filter((skill) => skill.level === "expert").length;

    return { total, available, offline, beginner, intermediate, expert };
  }, [skills]);

  const filteredSkills = useMemo(() => {
    const normalizedSearch = debouncedSearch;

    const results = skills
      .filter((skill) => !skill.deleted)
      .filter(
        (skill) =>
          filters.category === "all" || skill.category === filters.category,
      )
      .filter(
        (skill) => filters.level === "all" || skill.level === filters.level,
      )
      .filter((skill) =>
        filters.availability === "all"
          ? true
          : filters.availability === "available"
            ? skill.available
            : !skill.available,
      )
      .filter((skill) => {
        if (!normalizedSearch) return true;
        const query = normalizedSearch;
        return (
          (skill.name || "").toLowerCase().includes(query) ||
          (skill.category || "").toLowerCase().includes(query) ||
          String(skill.yearsOfExperience || "").includes(query)
        );
      });

    return results.sort((a, b) => {
      if (filters.sortBy === "experience") {
        return b.yearsOfExperience - a.yearsOfExperience;
      }
      if (filters.sortBy === "alpha") {
        return (a.name || "").localeCompare(b.name || "");
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [skills, filters, debouncedSearch]);

  const resetForm = () => {
    setForm(createBlankForm());
    setEditingId("");
    setFieldErrors({});
    setStatus("");
    setError("");
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    setStatus("");
    setError("");
  };

  const setFiltersValue = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const updateSkillsOnServer = async (nextSkills) => {
    setSaving(true);
    setError("");
    try {
      const { data } = await saveProfile(nextSkills);
      setSkills(Array.isArray(data.skills) ? data.skills : nextSkills);
      setStatus("Profile updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save profile updates.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      _id: editingId || `temp-${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      level: form.level,
      available: Boolean(form.available),
      yearsOfExperience: Number(form.yearsOfExperience),
      hourlyRate: Number(form.hourlyRate),
      lastVerified: form.lastVerified
        ? new Date(form.lastVerified).toISOString()
        : new Date().toISOString(),
      deleted: false,
    };

    let nextSkills;
    if (editingId) {
      // Find the skill to edit by matching the ID properly
      nextSkills = skills.map((skill, index) => {
        const skillId = getSkillId(skill, index);
        if (skillId === editingId) {
          // Preserve the original _id if it exists
          return {
            ...skill,
            name: payload.name,
            category: payload.category,
            level: payload.level,
            available: payload.available,
            yearsOfExperience: payload.yearsOfExperience,
            hourlyRate: payload.hourlyRate,
            lastVerified: payload.lastVerified,
            deleted: payload.deleted,
          };
        }
        return skill;
      });
    } else {
      nextSkills = [...skills, payload];
    }

    await updateSkillsOnServer(nextSkills);
    resetForm();
  };

  const handleEdit = (skill, index) => {
    const skillId = getSkillId(skill, index);
    setEditingId(skillId);
    setForm({
      _id: skill._id ? String(skill._id) : "",
      name: skill.name || "",
      category: skill.category || "General",
      level: skill.level || "intermediate",
      available: typeof skill.available === "boolean" ? skill.available : true,
      yearsOfExperience: skill.yearsOfExperience ?? 0,
      hourlyRate: skill.hourlyRate ?? 0,
      lastVerified: skill.lastVerified
        ? new Date(skill.lastVerified).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    setStatus("Editing existing skill. Remember to save changes.");
  };

  const handleSelection = (skillId) => {
    setSelectedIds((current) =>
      current.includes(skillId)
        ? current.filter((id) => id !== skillId)
        : [...current, skillId],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredSkills.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(
      filteredSkills.map((skill, index) => getSkillId(skill, index)),
    );
  };

  const getSkillById = (id) => {
    return skills.find((skill, index) => getSkillId(skill, index) === id);
  };

  const confirmDelete = (skill, index) => {
    setConfirmState({
      open: true,
      mode: "single",
      label: skill.name,
      ids: [getSkillId(skill, index)],
    });
  };

  const confirmBulkDelete = () => {
    setConfirmState({
      open: true,
      mode: "bulk",
      label: `${selectedIds.length} skills`,
      ids: [...selectedIds],
    });
  };

  const performBulkAction = async (action, ids) => {
    // Filter out temporary/unsaved skill IDs (those without valid MongoDB ObjectIds)
    const validIds = ids.filter((id) => {
      // Valid MongoDB ObjectId format: 24 character hex string
      return /^[a-f0-9]{24}$/i.test(id);
    });

    if (validIds.length === 0) {
      setError(
        "Cannot perform bulk actions on unsaved skills. Please save skills first before using bulk operations.",
      );
      return;
    }

    if (validIds.length < ids.length) {
      setStatus(
        `Performing action on ${validIds.length} saved skill(s). Unsaved skills will be skipped.`,
      );
    }

    rollbackRef.current = skills;
    setSkills((current) =>
      current.filter(
        (skill, index) => !validIds.includes(getSkillId(skill, index)),
      ),
    );
    setSelectedIds((current) => current.filter((id) => !validIds.includes(id)));
    setStatus(`Applying ${action === "delete" ? "delete" : "update"}...`);
    setError("");

    try {
      const { data } = await bulkUpdateSkills(validIds, action);
      setSkills(Array.isArray(data.skills) ? data.skills : rollbackRef.current);
      setStatus(
        action === "delete"
          ? "Skills deleted successfully."
          : "Selected skills updated.",
      );
    } catch (err) {
      setSkills(rollbackRef.current);
      setError(err.response?.data?.message || "Bulk update failed.");
    }
  };

  const handleDeleteConfirmed = async () => {
    if (confirmState.ids.length === 0) return;
    await performBulkAction("delete", confirmState.ids);
    setConfirmState({ open: false, mode: "single", label: "", ids: [] });
  };

  const handleSetAllAvailable = async () => {
    if (selectedIds.length === 0) return;
    await performBulkAction("setAvailable", selectedIds);
  };

  const exportSelectedToCsv = () => {
    if (selectedIds.length === 0) return;
    const selected = skills.filter((skill, index) =>
      selectedIds.includes(getSkillId(skill, index)),
    );
    const csvRows = [
      [
        "Name",
        "Category",
        "Level",
        "Available",
        "Years of Exp",
        "Rate",
        "Last Verified",
        "Last Updated",
      ],
      ...selected.map((skill) => [
        skill.name,
        skill.category,
        skill.level,
        availabilityLabel(skill.available),
        skill.yearsOfExperience,
        `$${Number(skill.hourlyRate).toFixed(2)}`,
        skill.lastVerified
          ? new Date(skill.lastVerified).toLocaleDateString()
          : "Unknown",
        formatRelativeTime(skill.updatedAt),
      ]),
    ];
    const csvContent = csvRows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "selected-skills.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Exported selected skills to CSV.");
  };

  const clearFilters = () => {
    setFilters({
      category: "all",
      level: "all",
      availability: "all",
      sortBy: "recent",
    });
    setSearchTerm("");
    setSelectedIds([]);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <main className="flex-1 space-y-6">
            <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                    Community Profile
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold text-slate-900">
                    Manage your skills and availability
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Add, edit, search, filter, and bulk manage the capabilities
                    you want neighbors to find.
                  </p>
                </div>
                <div className="rounded-3xl bg-blue-50 p-4 text-sm text-blue-700 border border-blue-100 max-w-md">
                  <div className="flex items-center gap-2 font-semibold">
                    <Sparkles className="h-4 w-4" /> Tip:
                  </div>
                  <p className="mt-2 text-slate-700">
                    Use categories and updated rates to make your skills easier
                    to discover.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-3xl font-semibold text-slate-900">
                    {counts.total}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold">
                    Skills in profile
                  </p>
                </div>
                <div className="rounded-3xl bg-emerald-50 p-4 border border-emerald-100">
                  <p className="text-3xl font-semibold text-emerald-700">
                    {counts.available}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-emerald-600 font-semibold">
                    Available now
                  </p>
                </div>
                <div className="rounded-3xl bg-rose-50 p-4 border border-rose-100">
                  <p className="text-3xl font-semibold text-rose-700">
                    {counts.offline}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-rose-600 font-semibold">
                    Not available
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search skills, category, or years of experience"
                        className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Clear filters
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <select
                      value={filters.category}
                      onChange={(e) =>
                        setFiltersValue("category", e.target.value)
                      }
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    >
                      <option value="all">All categories</option>
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filters.level}
                      onChange={(e) => setFiltersValue("level", e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    >
                      {LEVEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filters.availability}
                      onChange={(e) =>
                        setFiltersValue("availability", e.target.value)
                      }
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    >
                      {AVAILABILITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Sort by
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFiltersValue("sortBy", e.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                    Skills overview
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">
                    Your active skills
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>{filteredSkills.length} results</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{selectedIds.length} selected</span>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((placeholder) => (
                      <div
                        key={placeholder}
                        className="animate-pulse rounded-3xl border border-slate-200 bg-slate-100 p-6"
                      >
                        <div className="h-4 w-1/3 rounded-full bg-slate-200" />
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="h-8 rounded-2xl bg-slate-200" />
                          <div className="h-8 rounded-2xl bg-slate-200" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredSkills.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center">
                    <p className="text-lg font-semibold text-slate-900">
                      No results found for “{searchTerm}”
                    </p>
                    <p className="mt-3 text-sm text-slate-600">
                      Try a different term or clear the filters to see all
                      skills.
                    </p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
                    >
                      <ChevronDown className="h-4 w-4" /> Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredSkills.map((skill, index) => {
                      const skillId = getSkillId(skill, index);
                      return (
                        <article
                          key={skillId}
                          className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200"
                        >
                          <div className="flex items-start gap-4">
                            <label className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white ring-blue-500 transition focus-within:ring-2">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(skillId)}
                                onChange={() => handleSelection(skillId)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                              />
                            </label>
                            <div className="min-w-0">
                              <h3 className="text-lg font-semibold text-slate-900 truncate">
                                {skill.name || "Unnamed skill"}
                              </h3>
                              <p className="text-sm text-slate-500 mt-1">
                                {skill.category || "General"}
                              </p>
                            </div>
                            <div className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                              {availabilityLabel(skill.available)}
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                Experience
                              </p>
                              <p className="mt-1 text-sm text-slate-900">
                                {skill.yearsOfExperience} years
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                Hourly rate
                              </p>
                              <p className="mt-1 text-sm text-slate-900">
                                ${Number(skill.hourlyRate).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-500">
                            <p>
                              Verified{" "}
                              {skill.lastVerified
                                ? new Date(
                                    skill.lastVerified,
                                  ).toLocaleDateString()
                                : "N/A"}
                            </p>
                            <p>Updated {formatRelativeTime(skill.updatedAt)}</p>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(skill, index)}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                            >
                              <Edit3 className="h-4 w-4" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDelete(skill, index)}
                              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside className="w-full max-w-xl space-y-6 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-600 p-3 text-white">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Add or edit a skill
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">
                    Profile builder
                  </h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Skill name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. cooking, solar installer"
                  />
                  {fieldErrors.name && (
                    <p className="mt-2 text-sm text-rose-600">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        handleFormChange("category", e.target.value)
                      }
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.category && (
                      <p className="mt-2 text-sm text-rose-600">
                        {fieldErrors.category}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Skill level
                    </label>
                    <select
                      value={form.level}
                      onChange={(e) =>
                        handleFormChange("level", e.target.value)
                      }
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {LEVEL_OPTIONS.filter(
                        (option) => option.value !== "all",
                      ).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Years of experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.yearsOfExperience ?? ""}
                      onChange={(e) =>
                        handleFormChange("yearsOfExperience", e.target.value)
                      }
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {fieldErrors.yearsOfExperience && (
                      <p className="mt-2 text-sm text-rose-600">
                        {fieldErrors.yearsOfExperience}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Hourly rate
                    </label>
                    <div className="relative mt-2 rounded-3xl border border-slate-200 bg-slate-50">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.hourlyRate ?? ""}
                        onChange={(e) =>
                          handleFormChange("hourlyRate", e.target.value)
                        }
                        className="w-full rounded-3xl border-0 bg-transparent px-10 py-3 text-sm outline-none focus:ring-0"
                      />
                    </div>
                    {fieldErrors.hourlyRate && (
                      <p className="mt-2 text-sm text-rose-600">
                        {fieldErrors.hourlyRate}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Last verified
                  </label>
                  <input
                    type="date"
                    value={form.lastVerified ?? ""}
                    onChange={(e) =>
                      handleFormChange("lastVerified", e.target.value)
                    }
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleFormChange("available", true)}
                    className={`rounded-3xl py-3 text-sm font-semibold transition ${form.available ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    Available
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormChange("available", false)}
                    className={`rounded-3xl py-3 text-sm font-semibold transition ${!form.available ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    Unavailable
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:bg-slate-300"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {editingId ? "Update skill" : "Add skill"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-700 transition"
                  >
                    Cancel editing
                  </button>
                )}
              </form>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Bulk management
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">
                    Selected skills
                  </h2>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm text-slate-600">
                <p>Use the checkbox on each card to select multiple skills.</p>
                <p className="text-slate-500">Selected: {selectedIds.length}</p>
              </div>

              <button
                type="button"
                onClick={handleSelectAll}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <Plus className="h-4 w-4" />{" "}
                {selectedIds.length === filteredSkills.length
                  ? "Deselect all"
                  : "Select all visible"}
              </button>
            </section>
          </aside>
        </div>
      </div>

      {selectedIds.length >= 2 && (
        <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 items-center justify-between rounded-3xl border border-slate-200 bg-white/95 px-5 py-4 shadow-xl backdrop-blur-sm">
          <div className="text-sm font-semibold text-slate-900">
            {selectedIds.length} skills selected
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={confirmBulkDelete}
              className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition"
            >
              Bulk Delete
            </button>
            <button
              type="button"
              onClick={handleSetAllAvailable}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
            >
              Set All Available
            </button>
            <button
              type="button"
              onClick={exportSelectedToCsv}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
            >
              <Download className="h-4 w-4" /> Export to CSV
            </button>
          </div>
        </div>
      )}

      {confirmState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">
              Confirm Delete
            </h3>
            <p className="mt-4 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              {confirmState.mode === "bulk"
                ? confirmState.label
                : `"${confirmState.label}"`}
              ? This action uses soft delete and preserves the history.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                className="flex-1 rounded-3xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 transition"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirmState({
                    open: false,
                    mode: "single",
                    label: "",
                    ids: [],
                  })
                }
                className="flex-1 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {(status || error) && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-3xl border px-5 py-4 text-sm shadow-lg transition duration-200 ${status ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}
        >
          {status || error}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
