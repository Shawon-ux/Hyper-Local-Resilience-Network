const MicroTask = require('../models/MicroTask');
const { getSkillSuggestions } = require('../utils/gemini');

// @desc    Post a new micro-task (automatically gets skill suggestions)
// @route   POST /api/microtasks
// @access  Private
exports.createMicroTask = async (req, res) => {
  try {
    const { title, description, location, urgency } = req.body;

    // Call Gemini to suggest skills
    let suggestedSkills = [];
    if (process.env.GROQ_API_KEY) {
      suggestedSkills = await getSkillSuggestions(description);
    }

    const microTask = await MicroTask.create({
      title,
      description,
      location,
      urgency,
      suggestedSkills,
      postedBy: req.user._id,
    });

    res.status(201).json(microTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all tasks posted by the logged-in user
// @route   GET /api/microtasks/my-tasks
// @access  Private
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await MicroTask.find({ postedBy: req.user._id }).sort('-createdAt');
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};