import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Users, AlertTriangle, ArrowLeft, Send, Trash2, Loader2 } from "lucide-react";
import Layout from "../components/Layout";
import Panel from "../components/Panel";
import Toast from "../components/Toast";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Swal from "sweetalert2";

export default function CommunityDetailPage() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  const filteredPosts = posts.filter((post) => {
    if (activeTab === "all") {
      return post.status === "pending" || !post.status;
    }
    if (activeTab === "my_acknowledged") {
      return String(post.author?._id || post.author) === currentUser?._id && post.status === "acknowledged";
    }
    return true;
  });

  const [emergencyMode, setEmergencyMode] = useState(false);
  const [togglingEmergency, setTogglingEmergency] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [postType, setPostType] = useState("normal");
  const [postDescription, setPostDescription] = useState("");
  const [emergencyWhat, setEmergencyWhat] = useState("");
  const [emergencyAmount, setEmergencyAmount] = useState("");
  const [emergencyWhen, setEmergencyWhen] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDetails = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.get(`/communities/${communityId}`);
      setCommunity(data.community);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load community");
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data } = await api.get(`/communities/${communityId}/posts`);
      setPosts(Array.isArray(data?.posts) ? data.posts : []);
      setEmergencyMode(data?.emergencyMode || false);
    } catch (err) {
      console.error("Failed to load posts:", err);
    }
  };

  useEffect(() => {
    if (communityId) {
      fetchDetails();
      fetchPosts();
    }
  }, [communityId]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    
    if (postType === "normal") {
      if (!postDescription.trim()) {
        setError("Description is required");
        return;
      }
    } else {
      if (!emergencyWhat.trim() || !emergencyAmount.trim() || !emergencyWhen.trim()) {
        setError("All emergency fields are required");
        return;
      }
    }

    setError("");
    setSubmitting(true);
    try {
      const payload = {
        type: postType,
      };

      if (postType === "emergency") {
        payload.emergencyData = {
          what: emergencyWhat.trim(),
          amount: emergencyAmount.trim(),
          when: emergencyWhen.trim(),
        };
      } else {
        payload.description = postDescription.trim();
      }

      const { data } = await api.post(`/communities/${communityId}/posts`, payload);
      if (data?.post) {
        setPosts((prev) => [data.post, ...prev]);
      }
      setPostDescription("");
      setEmergencyWhat("");
      setEmergencyAmount("");
      setEmergencyWhen("");
      setPostType("normal");
      setToast("Post created");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await api.delete(`/communities/${communityId}/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setToast("Post deleted");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete post");
    }
  };

  if (loading) {
    return (
      <Layout title="Community" subtitle="Loading...">
        <div className="grid place-items-center rounded-3xl bg-white p-10 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-600">Loading...</p>
        </div>
      </Layout>
    );
  }

  if (error && !community) {
    return (
      <Layout title="Community" subtitle="Error">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 mb-4">
            {error}
          </div>
          <Link
            to="/community"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Communities
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Layout
        title={community?.name || "Community"}
        subtitle={community?.isLeader ? "You are the leader of this community" : "You are a member"}
        right={
          <Link
            to="/community"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      >
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            {community?.emergencyMode && (
              <div className="mb-4 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3">
                <p className="text-sm font-bold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  EMERGENCY MODE ACTIVE
                </p>
                {community?.alertMessage && (
                  <p className="mt-2 text-sm text-rose-600 font-medium italic">
                    "{community.alertMessage}"
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{community?.name}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {community?.description || "No description"}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">{community?.memberCount || 0} members</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="font-medium">
                    Leader: {community?.leader?.name || "Unknown"}
                  </span>
                </div>
              </div>

              {community?.isLeader && (
                <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Emergency Mode</p>
                        <p className={`text-xs font-medium ${community?.emergencyMode ? "text-rose-600" : "text-slate-400"}`}>
                          {togglingEmergency ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Updating and notifying members...
                            </span>
                          ) : (
                            community?.emergencyMode ? "ACTIVE - Emergency posts enabled" : "Inactive"
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={togglingEmergency}
                        onClick={async () => {
                          const isTurningOn = !community?.emergencyMode;
                          let alertMessage = "";

                          if (isTurningOn) {
                            const { value: text, isConfirmed } = await Swal.fire({
                              title: "Emergency Alert",
                              input: "textarea",
                              inputLabel: "What is this alert about?",
                              inputPlaceholder: "Type your emergency message here...",
                              inputAttributes: {
                                "aria-label": "Type your emergency message here",
                              },
                              showCancelButton: true,
                              confirmButtonText: "Declare Emergency",
                              confirmButtonColor: "#e11d48", // rose-600
                              inputValidator: (value) => {
                                if (!value) {
                                  return "You need to write something!";
                                }
                              },
                            });

                            if (!isConfirmed) return;
                            alertMessage = text;
                          }

                          setError("");
                          setTogglingEmergency(true);

                          // Show loading SweetAlert
                          Swal.fire({
                            title: isTurningOn ? "Activating Emergency Mode" : "Deactivating Emergency Mode",
                            text: isTurningOn ? "Sending emails to all community members... This might take a few moments." : "Updating community status...",
                            allowOutsideClick: false,
                            didOpen: () => {
                              Swal.showLoading();
                            },
                          });

                          try {
                            const { data } = await api.post(`/communities/${communityId}/emergency-mode`, {
                              alertMessage,
                            });
                            if (data?.community) {
                              setCommunity((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      emergencyMode: data.community.emergencyMode,
                                      alertMessage: data.community.alertMessage,
                                    }
                                  : prev
                              );
                              setEmergencyMode(data.community.emergencyMode);
                            }
                            
                            // Close the loading SweetAlert
                            Swal.close();
                            setToast(data?.community?.emergencyMode ? "Emergency mode ON - Emails sent to members" : "Emergency mode OFF");
                          } catch (err) {
                            Swal.close();
                            setError(err?.response?.data?.message || err?.message || "Failed to toggle emergency mode");
                          } finally {
                            setTogglingEmergency(false);
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          community?.emergencyMode ? "bg-rose-500" : "bg-slate-300"
                        } disabled:opacity-60`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            community?.emergencyMode ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                </div>
              )}
            </div>
          </div>

          <Panel title="Create Post">
            <form onSubmit={handleCreatePost} className="space-y-4">
              {error && (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPostType("normal")}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    postType === "normal"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  disabled={!emergencyMode}
                  onClick={() => setPostType("emergency")}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    postType === "emergency"
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  title={!emergencyMode ? "Emergency mode must be declared to post emergency updates" : ""}
                >
                  Emergency
                </button>
                {!emergencyMode && (
                  <span className="text-xs text-slate-400 self-center">
                    Emergency mode not declared
                  </span>
                )}
              </div>

              {postType === "normal" ? (
                <textarea
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  placeholder="Write your post description..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                />
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">What do I want?</label>
                    <input
                      type="text"
                      value={emergencyWhat}
                      onChange={(e) => setEmergencyWhat(e.target.value)}
                      placeholder="e.g. Water bottles"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">How many I want?</label>
                    <input
                      type="text"
                      value={emergencyAmount}
                      onChange={(e) => setEmergencyAmount(e.target.value)}
                      placeholder="e.g. 50 units"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">When I want?</label>
                    <input
                      type="text"
                      value={emergencyWhen}
                      onChange={(e) => setEmergencyWhen(e.target.value)}
                      placeholder="e.g. By tomorrow 10 AM"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Posting..." : "Post"}
              </button>
            </form>
          </Panel>

          <Panel title={emergencyMode ? `Posts - Emergency posts prioritized` : `Posts`}>
            <div className="mb-6 flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 text-sm font-semibold transition-colors relative ${
                  activeTab === "all" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                All Pending Posts
                {activeTab === "all" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("my_acknowledged")}
                className={`px-4 py-2 text-sm font-semibold transition-colors relative ${
                  activeTab === "my_acknowledged" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                My Posts Acknowledged
                {activeTab === "my_acknowledged" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  {activeTab === "all" ? "No pending posts" : "No posts acknowledged yet"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {activeTab === "all" 
                    ? "Everything is up to date!" 
                    : "When someone acknowledges your post, it will appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => {
                  const statusColors = {
                    pending: "bg-yellow-100 text-yellow-700",
                    not_possible: "bg-slate-100 text-slate-600",
                    acknowledged: "bg-blue-100 text-blue-700",
                    completed: "bg-emerald-100 text-emerald-700",
                  };
                  const statusLabels = {
                    pending: "Pending",
                    not_possible: "Not Possible",
                    acknowledged: "Acknowledged",
                    completed: "Completed",
                  };

                  return (
                    <div
                      key={post._id}
                      className={`rounded-2xl border p-4 ${
                        post.type === "emergency"
                          ? "border-rose-200 bg-rose-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span
                              className={`inline-flex items-center rounded-2xl px-2 py-0.5 text-xs font-semibold ${
                                post.type === "emergency"
                                  ? "bg-rose-600 text-white"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {post.type === "emergency" ? (
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Emergency
                                </span>
                              ) : (
                                "Normal"
                              )}
                            </span>
                            {post.type === "emergency" && (
                              <span className={`inline-flex items-center rounded-2xl px-2 py-0.5 text-xs font-semibold ${statusColors[post.status] || statusColors.pending}`}>
                                {statusLabels[post.status] || "Pending"}
                              </span>
                            )}
                            <span className="text-xs text-slate-500">
                              by {post.author?.name || "Unknown"}
                            </span>
                          </div>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">{post.description}</p>
                          {post.status === "acknowledged" && post.acknowledgedBy && (
                            <p className="mt-1 text-xs font-medium text-blue-600">
                              Acknowledged by {post.acknowledgedBy.name}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-slate-400">
                            {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {post.type === "emergency" && (
                            <select
                              value={post.status || "pending"}
                              disabled={String(post.author?._id || post.author) === currentUser?._id && !community?.isLeader}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                try {
                                  const { data } = await api.patch(`/communities/${communityId}/posts/${post._id}/status`, { status: newStatus });
                                  if (data?.post) {
                                    setPosts((prev) => prev.map((p) => p._id === post._id ? { ...p, status: data.post.status, acknowledgedBy: data.post.acknowledgedBy } : p));
                                  }
                                  setToast("Status updated");
                                } catch (err) {
                                  setError(err?.response?.data?.message || "Failed to update status");
                                }
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="pending">Pending</option>
                              <option value="acknowledged">Acknowledged</option>
                            </select>
                          )}
                          {((String(post.author?._id || post.author) === currentUser?._id && (post.status === "pending" || !post.status)) || community?.isLeader) && (
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post._id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete post"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </Layout>
      <Toast message={toast} />
    </>
  );
}