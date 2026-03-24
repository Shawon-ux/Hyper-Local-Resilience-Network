const MicroTask = require('../models/MicroTask');
const User = require('../models/User');

// @desc    Vouch for a helper after task completion
// @route   POST /api/reputation/vouch/:taskId
// @access  Private
exports.vouchForHelper = async (req, res) => {
  try {
    const task = await MicroTask.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Ensure the logged-in user is the task poster and task is completed
    if (task.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the task poster can vouch' });
    }
    if (task.status !== 'completed') {
      return res.status(400).json({ message: 'Task must be completed before vouching' });
    }
    if (!task.helper) {
      return res.status(400).json({ message: 'No helper assigned to this task' });
    }

    const helper = await User.findById(task.helper);
    if (!helper) {
      return res.status(404).json({ message: 'Helper not found' });
    }

    // Increase reputation by 10 (or any amount)
    helper.reputationScore += 10;
    await helper.save();

    res.json({ message: 'Vouch successful', newReputation: helper.reputationScore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get reputation score for a user
// @route   GET /api/reputation/user/:userId
// @access  Private
exports.getUserReputation = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('reputationScore name');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ reputationScore: user.reputationScore, name: user.name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};