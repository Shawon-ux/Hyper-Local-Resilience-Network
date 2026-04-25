const MicroTask = require('../models/MicroTask');
const User = require('../models/User');

// Helper: calculate distance between two lat/lng points (Haversine formula)
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// @desc    Get top matching volunteers for a specific micro-task
// @route   GET /api/matching/microtask/:taskId
// @access  Private
exports.matchVolunteersForTask = async (req, res) => {
  try {
    const task = await MicroTask.findById(req.params.taskId).populate('postedBy', 'location');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Get all users except task poster
    const potentialHelpers = await User.find({ _id: { $ne: task.postedBy._id } });

    // Calculate match scores
    const scored = potentialHelpers.map(helper => {
      // Distance (closer = higher score; we invert distance)
      const distance = getDistance(
        task.location.lat, task.location.lng,
        helper.location.lat, helper.location.lng
      );
      const distanceScore = Math.max(0, 1 - distance / 5); // 0-1, higher better (within 5km)

      // Skill overlap
      let skillOverlap = 0;
      if (task.suggestedSkills.length > 0) {
        const helperSkills = helper.skills.map(s => s.name.toLowerCase());
        const matched = task.suggestedSkills.filter(skill =>
          helperSkills.includes(skill.toLowerCase())
        ).length;
        skillOverlap = matched / task.suggestedSkills.length;
      }

      // Reputation (normalized by max possible, assume max reputation 100)
      const reputationScore = Math.min(1, helper.reputationScore / 100);

      // Combine weights: distance 0.4, skill 0.4, reputation 0.2
      const totalScore = (distanceScore * 0.4) + (skillOverlap * 0.4) + (reputationScore * 0.2);

      return {
        userId: helper._id,
        name: helper.name,
        location: helper.location,
        skills: helper.skills,
        reputationScore: helper.reputationScore,
        distance: distance.toFixed(2),
        score: totalScore,
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    // Return top 5
    const top5 = scored.slice(0, 5);

    res.json({ taskId: task._id, matches: top5 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};