import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Panel from "../components/Panel";
import api from "../services/api";

export default function CommunityJoinPage() {
  const { communityId } = useParams();
  const navigate = useNavigate();

  const [community, setCommunity] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/communities/${communityId}/status`);
      setCommunity(data.community);
      setUserStatus(data.status);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load community details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (communityId) {
      fetchStatus();
    } else {
      setError("Invalid community link");
      setLoading(false);
    }
  }, [communityId]);

  const handleJoin = async () => {
    setError("");
    setSubmitting(true);
    try {
      await api.post(`/communities/${communityId}/join-request`);
      setSuccess("Join request sent successfully!");
      // Refresh status to show "Requested" state
      await fetchStatus();
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to submit join request";
      if (message.includes("Already a member") || message.includes("already pending")) {
        setSuccess("Join request is already pending.");
        await fetchStatus();
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  const renderContent = () => {
    if (loading) {
      return <p className="text-sm font-medium text-slate-600">Loading community details...</p>;
    }

    if (error && !community) {
      return (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      );
    }

    if (success) {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {success}
          </div>
          <div className="flex gap-3">
            <Link
              to="/community"
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Explore Communities
            </Link>
          </div>
        </div>
      );
    }

    const { isLeader, isMember, hasRequested } = userStatus || {};

    if (isLeader || isMember) {
      return (
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-600">
            You are already a member of **{community?.name}**.
          </p>
          <Link
            to="/community"
            className="inline-block rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Go to Communities
          </Link>
        </div>
      );
    }

    if (hasRequested) {
      return (
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-600">
            You have already requested to join **{community?.name}**. Please wait for the leader to approve.
          </p>
          <Link
            to="/community"
            className="inline-block rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Explore Other Communities
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{community?.name}</h3>
          <p className="mt-2 text-sm text-slate-600">{community?.description || "No description provided."}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleJoin}
            disabled={submitting}
            className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Joining..." : "Join Community"}
          </button>
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
        {error && (
          <p className="text-xs font-medium text-rose-600">{error}</p>
        )}
      </div>
    );
  };

  return (
    <Layout title="Join Community" subtitle="Review the community details before joining.">
      <Panel title="Community invitation">
        {renderContent()}
      </Panel>
    </Layout>
  );
}
