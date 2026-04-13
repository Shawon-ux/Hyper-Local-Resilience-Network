import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import Layout from "../components/Layout";
import Panel from "../components/Panel";
import Toast from "../components/Toast";
import api from "../services/api";

export default function CommunityPage() {
  const [query, setQuery] = useState("");
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const fetchCommunities = async (searchValue) => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.get("/communities", {
        params: { search: searchValue || "" },
      });
      setCommunities(Array.isArray(data?.communities) ? data.communities : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load communities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities("");
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await fetchCommunities(query.trim());
  };

  const requestJoin = async (communityId) => {
    setError("");
    try {
      await api.post(`/communities/${communityId}/join-request`);
      setCommunities((prev) =>
        prev.map((community) =>
          community._id === communityId ? { ...community, hasRequested: true } : community
        )
      );
      setToast("Join request sent");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to send join request");
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
      <Panel title="Find a community">
        <form onSubmit={handleSubmit} className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Search by name or description"
            />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Search
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {communities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-800">No communities found</p>
            <p className="mt-2 text-sm text-slate-500">Try a different search.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => {
              const disabled = community.isLeader || community.isMember || community.hasRequested;
              let buttonLabel = "Request to join";
              if (community.isLeader) buttonLabel = "Leader";
              else if (community.isMember) buttonLabel = "Member";
              else if (community.hasRequested) buttonLabel = "Requested";

              return (
                <div
                  key={community._id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-slate-900">{community.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Leader: {community.leader?.name || "Unknown"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => requestJoin(community._id)}
                      className={`rounded-2xl px-4 py-2 text-xs font-semibold shadow-sm transition disabled:opacity-60 ${
                        disabled
                          ? "bg-slate-100 text-slate-600"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {buttonLabel}
                    </button>
                  </div>

                  {community.description ? (
                    <p className="mt-3 text-sm text-slate-600">{community.description}</p>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No description</p>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {Number.isFinite(community.memberCount) ? `${community.memberCount} members` : "—"}
                    </span>
                    <span>
                      {community.createdAt ? new Date(community.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    );
  }, [communities, error, loading, query]);

  return (
    <>
      <Layout
        title="Community"
        subtitle="Search communities and request to join."
      >
        {content}
      </Layout>
      <Toast message={toast} />
    </>
  );
}

