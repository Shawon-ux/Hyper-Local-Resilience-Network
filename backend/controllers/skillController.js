const mongoose = require('mongoose');
const User = require('../models/User');

const transformSkill = (skill) => ({
  ...skill,
  _id: skill._id ? String(skill._id) : undefined,
  hourlyRate: skill.hourlyRate ? parseFloat(skill.hourlyRate.toString()) : 0,
  yearsOfExperience: skill.yearsOfExperience || 0,
  category: skill.category || 'General',
  lastVerified: skill.lastVerified || null,
  deleted: Boolean(skill.deleted),
  createdAt: skill.createdAt,
  updatedAt: skill.updatedAt,
});

const normalizeSkills = (skills = []) =>
  skills
    .filter(skill => String(skill.name || '').trim() !== '')
    .map((skill) => {
    const normalized = {
      name: String(skill.name || '').trim(),
      category: String(skill.category || 'General').trim(),
      level: ['beginner', 'intermediate', 'expert'].includes(skill.level)
        ? skill.level
        : 'intermediate',
      available: skill.available === false ? false : true,
      yearsOfExperience: Number(skill.yearsOfExperience) >= 0 ? Number(skill.yearsOfExperience) : 0,
      hourlyRate: mongoose.Types.Decimal128.fromString(
        String(Number(skill.hourlyRate || 0).toFixed(2))
      ),
      lastVerified: skill.lastVerified ? new Date(skill.lastVerified) : new Date(),
      deleted: Boolean(skill.deleted),
    };

    if (skill._id && mongoose.Types.ObjectId.isValid(skill._id)) {
      normalized._id = skill._id;
    }

    return normalized;
  });

// @desc    Create/update user's skills and availability
// @route   PUT /api/skills/profile
// @access  Private
exports.updateSkills = async (req, res) => {
  try {
    const { skills } = req.body;

    if (!Array.isArray(skills)) {
      return res.status(400).json({ message: 'Skills must be an array.' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.skills = normalizeSkills(skills);
    await user.save();

    const activeSkills = user.skills
      .filter((skill) => !skill.deleted)
      .map(skill =>transformSkill(skill.toObject()));

    res.json({ skills: activeSkills });
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
    const user = await User.findById(req.user._id).select('skills').lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const activeSkills = (user.skills || [])
      .filter((skill) => !skill.deleted)
      .map(transformSkill)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({ skills: activeSkills });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Perform bulk skill actions for selected skill ids
// @route   PUT /api/skills/batch
// @access  Private
exports.bulkUpdateSkills = async (req, res) => {
  try {
    const { skillIds, action } = req.body;

    if (!Array.isArray(skillIds) || skillIds.length === 0) {
      return res.status(400).json({ message: 'Selected skills are required.' });
    }

    // Fix: Modern Mongoose ObjectId conversion
    const validObjectIds = skillIds
      .filter((id) => mongoose.Types.ObjectId.isValid(String(id)))
      .map((id) => new mongoose.Types.ObjectId(String(id))); // Added 'new' and 'Types'

    if (validObjectIds.length === 0) {
      return res.status(400).json({ message: 'No valid skill ids provided.' });
    }

    const updateField = action === 'delete' ? 'skills.$[item].deleted' : 'skills.$[item].available';
    
    // Perform the atomic update
    await User.updateOne(
      { _id: req.user._id },
      { $set: { [updateField]: true } },
      { arrayFilters: [{ 'item._id': { $in: validObjectIds } }] }
    );

    // Fetch the updated user to return the new list
    const user = await User.findById(req.user._id).select('skills').lean();
    const activeSkills = (user.skills || [])
      .filter((skill) => !skill.deleted)
      .map(transformSkill)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({ skills: activeSkills });
  } catch (error) {
    console.error("Bulk Update Error:", error);
    res.status(500).json({ message: 'Server error during bulk operation' });
  }
};