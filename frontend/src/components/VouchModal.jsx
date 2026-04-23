import { useState } from "react";
import { Star, MessageCircle, CheckCircle, X } from "lucide-react";
import { createVouch } from "../services/reputationService";
import Toast from "./Toast";

export default function VouchModal({ task, helper, onClose, onSuccess }) {
  const [selectedSkill, setSelectedSkill] = useState(
    task?.selectedSkills?.[0] || "",
  );
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmitVouch = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedSkill || rating === 0) {
      setError("Please select a skill and rating");
      return;
    }

    setLoading(true);
    try {
      const vouchData = {
        taskID: task._id,
        recipientID: helper._id,
        skillCategory: selectedSkill,
        rating,
        comment,
      };

      const result = await createVouch(vouchData);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose?.();
        }, 2000);
      } else {
        setError(result.message || "Failed to create vouch");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error creating vouch");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md text-center shadow-lg">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Vouch Submitted!
          </h3>
          <p className="text-slate-600">
            Thank you for verifying {helper?.name}'s work. Their reputation has
            been updated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            Rate & Verify Work
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmitVouch} className="p-6 space-y-4">
          {/* Helper Info */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm text-slate-600">
              Verifying work by{" "}
              <span className="font-semibold">{helper?.name}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">{task?.title}</p>
          </div>

          {/* Skill Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Skill Used
            </label>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select a skill</option>
              {task?.selectedSkills?.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Rating
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  disabled={loading}
                  className={`transition-all ${
                    star <= rating
                      ? "text-yellow-400"
                      : "text-slate-300 hover:text-yellow-300"
                  }`}
                >
                  <Star className="w-8 h-8 fill-current" />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-slate-600 mt-1">
                {rating === 5 && "⭐ Excellent work!"}
                {rating === 4 && "✨ Great work!"}
                {rating === 3 && "👍 Good work"}
                {rating === 2 && "⚠️ Could be better"}
                {rating === 1 && "❌ Needs improvement"}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Comment (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about the work quality..."
              maxLength={500}
              rows={3}
              disabled={loading}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">{comment.length}/500</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || rating === 0 || !selectedSkill}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit Vouch
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
