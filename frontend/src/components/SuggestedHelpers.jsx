import React, { useEffect, useState } from "react";
import { getMatchesForTask } from "../services/taskService";
import { Sparkles, MapPin, Star, User } from "lucide-react";
import ReputationBadge from "./ReputationBadge";

const SuggestedHelpers = ({ taskId }) => {
  const [helpers, setHelpers] = useState([]);
  const [skillDensity, setSkillDensity] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedHelper, setExpandedHelper] = useState(null);

  useEffect(() => {
    const fetchHelpers = async () => {
      setLoading(true);
      try {
        const data = await getMatchesForTask(taskId);
        setHelpers(data.matches || []);
        setSkillDensity(data.skillDensity || {});
      } catch (err) {
        setError(
          err?.response?.data?.message || "Failed to fetch suggested helpers.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHelpers();
  }, [taskId]);

  if (loading) {
    return (
      <div className="text-sm text-slate-500 mt-4 animate-pulse">
        Finding best matches nearby...
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-rose-500 mt-4">{error}</div>;
  }

  if (helpers.length === 0) {
    return (
      <div className="mt-4 rounded-2xl bg-slate-50 p-4 border border-slate-200">
        <p className="text-sm text-slate-600">
          No active volunteers with matching skills found within 20km right now.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Suggested Helpers Nearby
          </h3>
        </div>
        
        {/* Skill Density Information */}
        {Object.keys(skillDensity).length > 0 && (
          <div className="flex flex-wrap gap-3">
            {Object.entries(skillDensity).map(([skill, count]) => (
              <div key={skill} className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-1.5">
                <span className="text-xs font-bold text-blue-700">{skill}</span>
                <span className="h-4 w-[1px] bg-blue-200"></span>
                <span className="text-[10px] font-medium text-blue-600">
                  {count} {count === 1 ? "person has" : "people have"} this skill
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {helpers.map((helper) => (
          <div
            key={helper.userId}
            className={`flex flex-col p-4 rounded-2xl bg-white border transition-all cursor-pointer ${
              expandedHelper === helper.userId
                ? "border-blue-300 shadow-lg"
                : "border-slate-200 shadow-sm hover:shadow-md"
            }`}
            onClick={() =>
              setExpandedHelper(
                expandedHelper === helper.userId ? null : helper.userId,
              )
            }
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-900">
                    {helper.name}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    <span>{helper.distance}m away</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                  {helper.score}% Match
                </span>
              </div>
            </div>

            {/* Reputation Badge Compact View */}
            {!expandedHelper && helper.reputation && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-slate-900">
                  {helper.reputation?.averageRating?.toFixed(1) || "0"}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-600">
                  {helper.reputation?.totalVouches || 0} vouches
                </span>
              </div>
            )}

            {/* Skills */}
            {helper.skills && helper.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {helper.skills
                  .slice(0, expandedHelper === helper.userId ? undefined : 3)
                  .map((skill, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-medium"
                    >
                      {skill.name}
                    </span>
                  ))}
                {!expandedHelper && helper.skills.length > 3 && (
                  <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">
                    +{helper.skills.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Expanded Reputation View */}
            {expandedHelper === helper.userId && helper.reputation && (
              <div className="mt-3">
                <ReputationBadge user={helper} compact={false} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestedHelpers;
