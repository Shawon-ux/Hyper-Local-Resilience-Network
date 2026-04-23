import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { User, Star, Trophy, TrendingUp, Award, Clock } from "lucide-react";
import {
  getUserReputation,
  getUserVouches,
  getReputationTransactions,
} from "../services/reputationService";
import Layout from "../components/Layout";
import Panel from "../components/Panel";

export default function ReputationProfilePage() {
  const { userId } = useParams();
  const [userReputation, setUserReputation] = useState(null);
  const [vouches, setVouches] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const loadReputation = async () => {
      try {
        setLoading(true);
        const [repData, vouchData, transData] = await Promise.all([
          getUserReputation(userId),
          getUserVouches(userId, 10),
          getReputationTransactions(userId, 20),
        ]);

        setUserReputation(repData.data.user);
        setVouches(vouchData.data.vouches || []);
        setTransactions(transData.data.transactions || []);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load reputation data",
        );
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadReputation();
    }
  }, [userId]);

  if (loading) {
    return (
      <Layout
        title="Reputation Profile"
        subtitle="User verification and trust metrics"
      >
        <div className="text-center py-12">
          <p className="text-slate-500">Loading reputation data...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout
        title="Reputation Profile"
        subtitle="User verification and trust metrics"
      >
        <Panel title="Error">
          <div className="text-rose-600">{error}</div>
        </Panel>
      </Layout>
    );
  }

  if (!userReputation) {
    return (
      <Layout
        title="Reputation Profile"
        subtitle="User verification and trust metrics"
      >
        <Panel title="Not Found">
          <p className="text-slate-600">User reputation data not found</p>
        </Panel>
      </Layout>
    );
  }

  const rep = userReputation.reputation || {};

  return (
    <Layout
      title={`${userReputation.name}'s Reputation`}
      subtitle="Trust and verification metrics"
    >
      <div className="space-y-6">
        {/* Header Stats */}
        <Panel title="Overview">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">
                {userReputation.reputationScore}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Reputation Score
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
              <div className="flex items-baseline gap-1">
                <div className="text-3xl font-bold text-yellow-600">
                  {rep.averageRating?.toFixed(1) || "0"}
                </div>
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              </div>
              <div className="text-sm text-slate-600 mt-1">Average Rating</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">
                {rep.totalVouches || 0}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Verified Vouches
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">
                {rep.trustScore || 0}
              </div>
              <div className="text-sm text-slate-600 mt-1">Trust Score</div>
            </div>
          </div>
        </Panel>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex gap-4">
            {["vouches", "transactions"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
              >
                {tab === "overview" && "Overview"}
                {tab === "vouches" && `Vouches (${vouches.length})`}
                {tab === "transactions" &&
                  `Transaction Log (${transactions.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Vouches Tab */}
        {activeTab === "vouches" && (
          <Panel title="Recent Vouches">
            {vouches.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No vouches yet</p>
            ) : (
              <div className="space-y-3">
                {vouches.map((vouch) => (
                  <div
                    key={vouch._id}
                    className="border border-slate-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-slate-900">
                          {vouch.voterID?.name || "Anonymous"}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {new Date(vouch.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < vouch.rating
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-slate-300"
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      Skill:{" "}
                      <span className="font-medium">{vouch.skillCategory}</span>
                    </p>
                    {vouch.comment && (
                      <p className="text-sm text-slate-600 italic bg-slate-50 p-2 rounded">
                        "{vouch.comment}"
                      </p>
                    )}
                    {vouch.isVerified && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                        <Award className="w-3 h-3" />
                        Verified local member
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Transaction Log Tab */}
        {activeTab === "transactions" && (
          <Panel title="Reputation Transaction Log">
            {transactions.length === 0 ? (
              <p className="text-slate-600 text-center py-8">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="border border-slate-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-slate-900">
                          {transaction.reason.replace(/_/g, " ")}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div
                        className={`text-lg font-bold ${transaction.amount > 0
                          ? "text-green-600"
                          : "text-red-600"
                          }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {transaction.amount}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Previous</p>
                        <p className="font-medium text-slate-900">
                          {transaction.previousScore}
                        </p>
                      </div>
                      <div className="text-slate-400">→</div>
                      <div>
                        <p className="text-slate-500">New</p>
                        <p className="font-medium text-slate-900">
                          {transaction.newScore}
                        </p>
                      </div>
                    </div>
                    {transaction.description && (
                      <p className="text-sm text-slate-600 mt-2">
                        {transaction.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>
    </Layout>
  );
}
