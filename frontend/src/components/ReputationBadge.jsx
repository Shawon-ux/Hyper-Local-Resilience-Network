import { Star, Trophy, TrendingUp } from "lucide-react";

export default function ReputationBadge({ user, compact = false }) {
  if (!user?.reputation && !user?.reputationScore) {
    return null;
  }

  const totalVouches = user.reputation?.totalVouches || 0;
  const averageRating = user.reputation?.averageRating || 0;
  const trustScore = user.reputation?.trustScore || 0;
  const reputationScore = user.reputationScore || 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="font-semibold text-slate-900">
            {averageRating.toFixed(1)}
          </span>
        </div>
        <span className="text-slate-500">•</span>
        <div className="flex items-center gap-1">
          <Trophy className="w-4 h-4 text-blue-500" />
          <span className="text-slate-600">{totalVouches}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg p-4 border border-blue-100">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-slate-900 text-sm">Reputation</h4>
        <Trophy className="w-5 h-5 text-blue-600" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Reputation Score */}
        <div className="bg-white rounded-lg p-2 text-center">
          <p className="text-2xl font-bold text-blue-600">{reputationScore}</p>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">
            Score
          </p>
        </div>

        {/* Average Rating */}
        <div className="bg-white rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="text-2xl font-bold text-yellow-500">
              {averageRating.toFixed(1)}
            </span>
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          </div>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">
            Rating
          </p>
        </div>

        {/* Trust Score */}
        <div className="bg-white rounded-lg p-2 text-center">
          <p className="text-2xl font-bold text-green-600">{trustScore}</p>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">
            Trust
          </p>
        </div>
      </div>

      {/* Vouches Count */}
      <div className="mt-3 bg-white rounded-lg p-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Verified Vouches:</span>
          <span className="font-semibold text-slate-900">{totalVouches}</span>
        </div>
      </div>

      {/* Skill Endorsements */}
      {user.reputation?.skillEndorsements &&
        user.reputation.skillEndorsements.size > 0 && (
          <div className="mt-3 bg-white rounded-lg p-2">
            <p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
              Skills
            </p>
            <div className="space-y-1">
              {Array.from(user.reputation.skillEndorsements.entries())
                .slice(0, 3)
                .map(([skill, data]) => (
                  <div
                    key={skill}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-600">{skill}</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-900">
                        {data.averageRating?.toFixed(1) || "0"}
                      </span>
                      <span className="text-slate-500">({data.count})</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
    </div>
  );
}
