const MicroTask = require('../models/MicroTask');
const { getSkillSuggestions, analyzeTaskDescription } = require('../utils/gemini');

// @desc    Post a new micro-task (automatically gets skill suggestions)
// @route   POST /api/microtasks
// @access  Private
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

// @desc    Analyze micro-task description and return suggested skills
// @route   POST /api/tasks/analyze
// @access  Public
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

// @desc    Get all tasks posted by the logged-in user
// @route   GET /api/microtasks/my-tasks
// @access  Private
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await MicroTask.find({ postedBy: req.user._id })
      .populate('helper', 'name phone email')
      .sort('-createdAt');
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a micro-task owned by the logged-in user
// @route   PATCH /api/microtasks/:id
// @access  Private
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

// @desc    Delete a micro-task owned by the logged-in user
// @route   DELETE /api/microtasks/:id
// @access  Private
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

// @desc    Accept a micro-task
// @route   POST /api/microtasks/:id/accept
// @access  Private
exports.acceptTask = async (req, res) => {
  try {
    const task = await MicroTask.findById(req.params.id).populate('postedBy', 'name');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status !== 'open') {
      return res.status(400).json({ message: 'Task is no longer available to be accepted' });
    }

    if (task.postedBy._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot accept your own task' });
    }

    task.status = 'in-progress';
    task.helper = req.user._id;
    await task.save();

    const Notification = require('../models/Notification');
    const notification = await Notification.create({
      user: task.postedBy._id,
      type: 'TASK_ACCEPTED',
      title: 'Task Accepted!',
      message: `A neighbor accepted your task: ${task.title}!`,
      meta: {
        taskId: task._id
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(task.postedBy._id.toString()).emit("notification", notification);
    }

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all available open tasks not posted by user
// @route   GET /api/microtasks/available
// @access  Private
exports.getAvailableTasks = async (req, res) => {
  try {
    const tasks = await MicroTask.find({
      status: 'open',
      postedBy: { $ne: req.user._id }
    })
      .populate('postedBy', 'name phone email')
      .sort('-createdAt');
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark a micro-task as completed
// @route   POST /api/microtasks/:id/complete
// @access  Private
exports.completeTask = async (req, res) => {
  try {
    const task = await MicroTask.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to complete this task' });
    }

    if (task.status !== 'in-progress') {
      return res.status(400).json({ message: 'Task is not in-progress' });
    }

    task.status = 'completed';
    await task.save();

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};