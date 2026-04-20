const MicroTask = require('../models/MicroTask');
const { getSkillSuggestions, analyzeTaskDescription } = require('../utils/gemini');

exports.createMicroTask = async (req, res) => {
  try {
    const { title, description, location, urgency, skills, selectedSkills } = req.body;

    const userSelectedSkills = Array.isArray(selectedSkills)
      ? selectedSkills
      : Array.isArray(skills)
      ? skills
      : [];

    let aiSuggestedSkills = [];
    if (process.env.GROQ_API_KEY) {
      aiSuggestedSkills = await getSkillSuggestions(description);
    }

    const microTask = await MicroTask.create({
      title,
      description,
      location,
      urgency,
      suggestedSkills: aiSuggestedSkills,
      selectedSkills: userSelectedSkills,
      postedBy: req.user._id,
      audit: {
        createdBy: req.user._id,
        aiSuggestedSkills,
        selectedSkills: userSelectedSkills,
      },
    });

    res.status(201).json(microTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.analyzeTask = async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ message: 'AI integration is not configured' });
    }

    const analysis = await analyzeTaskDescription(description);
    res.json(analysis);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await MicroTask.find({ postedBy: req.user._id }).sort('-createdAt');
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.updateMicroTask = async (req, res) => {
  try {
    const { title, description, urgency } = req.body;
    const task = await MicroTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const descriptionChanged = description?.trim() && description.trim() !== task.description;

    task.title = title?.trim() ? title : task.title;
    task.description = description?.trim() ? description : task.description;
    task.urgency = urgency || task.urgency;

    if (descriptionChanged && process.env.GROQ_API_KEY) {
      task.suggestedSkills = await getSkillSuggestions(description);
    }

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.deleteMicroTask = async (req, res) => {
  try {
    const task = await MicroTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await MicroTask.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};