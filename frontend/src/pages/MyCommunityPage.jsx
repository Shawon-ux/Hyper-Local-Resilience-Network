import { useEffect, useMemo, useState } from "react";
import { Copy, Plus, RefreshCcw } from "lucide-react";
import Layout from "../components/Layout";
import Panel from "../components/Panel";
import Toast from "../components/Toast";
import api from "../services/api";

const emptyForm = { name: "", description: "" };

export default function MyCommunityPage() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [requestAction, setRequestAction] = useState({});

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const fetchMine = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.get("/communities/mine");
      setCommunities(Array.isArray(data?.communities) ? data.communities : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load communities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMine();
  }, []);

  const closeCreate = () => {
    setShowCreate(false);
    setCreating(false);
    setForm(emptyForm);
    setFormError("");
  };

  const copyJoinLink = async (communityId) => {
    const link = `${window.location.origin}/community-join/${communityId}`;
    try {
      await navigator.clipboard.writeText(link);
      setToast("Link copied");
    } catch (err) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = link;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setToast("Link copied");
      } catch (err2) {
        setToast("Copy failed");
      }
    }
  };

  const setRequestActionLoading = (communityId, userId, loadingValue) => {
    const key = `${communityId}:${userId}`;
    setRequestAction((prev) => ({ ...prev, [key]: loadingValue }));
  };

  const isRequestActionLoading = (communityId, userId) => {
    const key = `${communityId}:${userId}`;
    return Boolean(requestAction[key]);
  };

  const acceptRequest = async (communityId, userId) => {
    setError("");
    setRequestActionLoading(communityId, userId, true);
    try {
      const { data } = await api.post(`/communities/${communityId}/requests/${userId}/accept`);
      if (data?.community) {
        setCommunities((prev) => prev.map((c) => (c._id === communityId ? data.community : c)));
      } else {
        await fetchMine();
      }
      setToast("Request accepted");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to accept request");
    } finally {
      setRequestActionLoading(communityId, userId, false);
    }
  };

  const declineRequest = async (communityId, userId) => {
    setError("");
    setRequestActionLoading(communityId, userId, true);
    try {
      const { data } = await api.post(`/communities/${communityId}/requests/${userId}/decline`);
      if (data?.community) {
        setCommunities((prev) => prev.map((c) => (c._id === communityId ? data.community : c)));
      } else {
        await fetchMine();
      }
      setToast("Request declined");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to decline request");
    } finally {
      setRequestActionLoading(communityId, userId, false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setFormError("");

    const name = String(form.name || "").trim();
    const description = String(form.description || "").trim();

    if (name.length < 2) {
      setFormError("Community name must be at least 2 characters");
      return;
    }

    setCreating(true);
    try {
      const { data } = await api.post("/communities", { name, description });
      if (data?.community) {
        setCommunities((prev) => [data.community, ...prev]);
      } else {
        await fetchMine();
      }
      setToast("Community created");
      closeCreate();
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0 && apiErrors[0]?.msg) {
        setFormError(apiErrors[0].msg);
      } else {
        setFormError(err?.response?.data?.message || err?.message || "Failed to create community");
      }
    } finally {
      setCreating(false);
    }
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="grid place-items-center rounded-3xl bg-white p-10 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-600">Loading...</p>
        </div>
      );
    }

    return (
      <Panel
        title="Your communities"
        actions={
          <button
            type="button"
            onClick={fetchMine}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        }
      >
        {error && (
          <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {communities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-800">No communities yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Create one with the + button to become the leader.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <div
                key={community._id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-bold text-slate-900">
                    {community.name || "Untitled"}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyJoinLink(community._id)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    <Copy className="h-4 w-4" />
                    COPY LINK
                  </button>
                </div>
                {community.description ? (
                  <p className="mt-2 text-sm text-slate-600">{community.description}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No description</p>
                )}
                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>{Array.isArray(community.members) ? `${community.members.length} members` : "—"}</span>
                  <span>
                    {community.createdAt ? new Date(community.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>

                {Array.isArray(community.joinRequests) && community.joinRequests.length > 0 && (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Join requests
                    </p>
                    <div className="mt-3 space-y-3">
                      {community.joinRequests.map((reqItem) => {
                        const user = reqItem?.user;
                        const userId = user?._id || reqItem?.user;
                        const busy = isRequestActionLoading(community._id, userId);

                        return (
                          <div
                            key={userId}
                            className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-white p-3 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">
                                {user?.name || "User"}
                              </p>
                              <p className="break-all text-xs font-medium text-slate-500 sm:truncate">
                                {user?.email || ""}
                              </p>
                              {user?.address && (
                                <p className="mt-1 text-xs text-slate-400 italic">
                                  {user.address}
                                  {user?.location?.lat && user?.location?.lng && (
                                    <span className="ml-1 not-italic text-slate-300">
                                      ({user.location.lat.toFixed(4)}, {user.location.lng.toFixed(4)})
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap sm:justify-end">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => acceptRequest(community._id, userId)}
                                className="whitespace-nowrap rounded-2xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                              >
                                {busy ? "Working..." : "Accept"}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => declineRequest(community._id, userId)}
                                className="whitespace-nowrap rounded-2xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    );
  }, [communities, error, loading]);

  return (
    <>
      <Layout
        title="My Communities"
        subtitle="Communities you created (you are the leader)."
        right={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Create
          </button>
        }
      >
        {content}
      </Layout>

      {showCreate && (
        <div className="fixed inset-0 z-[1500] grid place-items-center bg-slate-900/50 px-4 py-10">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  New community
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">Create a community</p>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreate}>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="e.g. Riverside Helpers"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="What is this community about?"
                />
              </div>

              {formError && (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreate}
                  disabled={creating}
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </>
  );
}
