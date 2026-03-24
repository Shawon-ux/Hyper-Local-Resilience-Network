const User = require('../models/User');

// @desc    Create/update user's skills and availability
// @route   PUT /api/skills/profile
// @access  Private
exports.updateSkills = async (req, res) => {
  try {
    const { skills } = req.body; // { name, level, available }
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.skills = skills;
    await user.save();

    res.json({ skills: user.skills });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current user's skills profile
// @route   GET /api/skills/my-profile
// @access  Private
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('skills');
    res.json({ skills: user.skills });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};