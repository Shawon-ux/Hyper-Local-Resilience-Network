const User = require('../models/User');
const Vouch = require('../models/Vouch');
const ReputationTransaction = require('../models/ReputationTransaction');
const MicroTask = require('../models/MicroTask');

/**
 * Create a new vouch (after task completion)
 * POST /api/reputation/vouch
 */
exports.createVouch = async (req, res) => {
  try {
    const { taskID, recipientID, skillCategory, rating, comment } = req.body;
    const voterID = req.user.id || req.user._id;

    // Validate input
    if (!taskID || !recipientID || !skillCategory || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    // Verify task exists and matches the users
    const task = await MicroTask.findById(taskID);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Ensure the voter is the task poster and recipient is the helper
    if (task.postedBy.toString() !== voterID.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the task creator can vouch for the helper',
      });
    }

    if (task.helper.toString() !== recipientID.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Can only vouch for the assigned helper',
      });
    }

    // Check if task is completed
    if (task.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only vouch for completed tasks',
      });
    }

    // Check if already vouched for this task
    const existingVouch = await Vouch.findOne({ taskID, voterID });
    if (existingVouch) {
      return res.status(400).json({
        success: false,
        message: 'You have already vouched for this task',
      });
    }

    // Create vouch
    const vouch = new Vouch({
      voterID,
      recipientID,
      taskID,
      skillCategory,
      rating,
      comment: comment || '',
      isVerified: true, // Auto-verify for now
      verifiedAt: new Date(),
    });

    await vouch.save();

    // Mark task as vouched
    task.vouched = true;
    await task.save();

    // Recalculate recipient's reputation
    const transactionID = await recalculateReputation(
      recipientID,
      'VOUCH_EARNED',
      vouch._id.toString(),
      {
        skillCategory,
        taskTitle: task.title,
        voucherName: (await User.findById(voterID)).name,
      },
      voterID
    );

    // Link transaction to vouch
    vouch.transactionID = transactionID;
    await vouch.save();

    // Emit Socket.io event for real-time update
    if (req.io) {
      const updatedUser = await User.findById(recipientID);
      req.io.to(recipientID.toString()).emit('reputation_updated', {
        userID: recipientID,
        newScore: updatedUser.reputationScore,
        vouchCount: await Vouch.countDocuments({ recipientID }),
      });
    }

    res.status(201).json({
      success: true,
      message: 'Vouch created successfully',
      data: vouch,
    });
  } catch (error) {
    console.error('Error creating vouch:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Recalculate user's reputation score
 * This function is called whenever a vouch is added/removed
 */
const recalculateReputation = async (
  userID,
  reason,
  relatedEntityID,
  metadata = {},
  initiatedBy = null
) => {
  try {
    const user = await User.findById(userID);
    if (!user) throw new Error('User not found');

    const previousScore = user.reputationScore || 0;

    // Get all verified vouches
    const vouches = await Vouch.find({ recipientID: userID, isVerified: true });

    // Base calculation: 10 points per verified vouch
    let baseScore = vouches.length * 10;

    // Bonus for higher ratings: +5 per 5-star, +3 per 4-star
    const ratingBonus = vouches.reduce((total, vouch) => {
      if (vouch.rating === 5) return total + 5;
      if (vouch.rating === 4) return total + 3;
      return total;
    }, 0);

    let newScore = baseScore + ratingBonus;

    // Apply penalty for low ratings
    const lowRatings = vouches.filter((v) => v.rating <= 2).length;
    const penalty = lowRatings * 5;
    newScore = Math.max(0, newScore - penalty);

    // Update user's reputation
    user.reputationScore = newScore;
    if (!user.reputation) {
      user.reputation = {};
    }
    user.reputation.totalVouches = vouches.length;
    user.reputation.lastVouchDate = new Date();

    // Calculate skill-specific endorsements
    const skillEndorsements = new Map();
    vouches.forEach((vouch) => {
      const skill = vouch.skillCategory;
      if (!skillEndorsements.has(skill)) {
        skillEndorsements.set(skill, { ratings: [], count: 0 });
      }
      const endorsement = skillEndorsements.get(skill);
      endorsement.ratings.push(vouch.rating);
      endorsement.count = endorsement.ratings.length;
      skillEndorsements.set(skill, endorsement);
    });

    // Calculate average rating per skill
    const reputationMap = new Map();
    skillEndorsements.forEach((value, skill) => {
      const avgRating =
        value.ratings.reduce((a, b) => a + b, 0) / value.ratings.length;
      reputationMap.set(skill, {
        count: value.count,
        averageRating: parseFloat(avgRating.toFixed(2)),
        lastUpdated: new Date(),
      });
    });

    user.reputation.skillEndorsements = reputationMap;

    // Calculate overall average rating
    const allRatings = Array.from(skillEndorsements.values())
      .flatMap((v) => v.ratings);
    user.reputation.averageRating =
      allRatings.length > 0
        ? parseFloat(
          (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2)
        )
        : 0;

    // Trust score: based on consistency and verification rate
    user.reputation.trustScore = calculateTrustScore(
      vouches,
      user.reputation.averageRating
    );

    // Save user
    await user.save();

    // Create transaction log
    const transaction = new ReputationTransaction({
      userID,
      amount: newScore - previousScore,
      reason,
      description: `Reputation updated due to ${reason}`,
      relatedEntity: {
        entityType: 'Vouch',
        entityID: relatedEntityID,
      },
      initiatedBy,
      previousScore,
      newScore,
      metadata,
      status: 'completed',
    });

    await transaction.save();

    // Add transaction to user's history
    if (!user.reputation.transactionHistory) {
      user.reputation.transactionHistory = [];
    }
    user.reputation.transactionHistory.push(transaction._id);
    await user.save();

    return transaction._id;
  } catch (error) {
    console.error('Error recalculating reputation:', error);
    throw error;
  }
};

/**
 * Calculate trust score based on consistency and verification
 */
const calculateTrustScore = (vouches, averageRating) => {
  if (vouches.length === 0) return 0;

  // Base trust: number of vouches (max 50 points)
  const vouchPoints = Math.min(vouches.length * 5, 50);

  // Rating consistency (max 30 points)
  const ratings = vouches.map((v) => v.rating);
  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const variance =
    ratings.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0) /
    ratings.length;
  const consistency = Math.max(0, 30 - variance * 10);

  // Verification bonus (max 20 points)
  const verifiedCount = vouches.filter((v) => v.isVerified).length;
  const verificationBonus = (verifiedCount / vouches.length) * 20;

  const trustScore = vouchPoints + consistency + verificationBonus;
  return Math.round(trustScore);
};

/**
 * Get user's reputation details
 * GET /api/reputation/:userID
 */
exports.getUserReputation = async (req, res) => {
  try {
    const { userID } = req.params;

    const user = await User.findById(userID);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const vouches = await Vouch.find({ recipientID: userID })
      .populate('voterID', 'name phone')
      .populate('taskID', 'title')
      .sort('-createdAt')
      .limit(20);

    const transactions = await ReputationTransaction.find({ userID })
      .sort('-createdAt')
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          reputationScore: user.reputationScore,
          reputation: user.reputation,
        },
        vouches,
        recentTransactions: transactions,
      },
    });
  } catch (error) {
    console.error('Error fetching reputation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Get leaderboard of top users by reputation
 * GET /api/reputation/leaderboard?limit=10&skillCategory=optional
 */
exports.getReputationLeaderboard = async (req, res) => {
  try {
    const { limit = 10, skillCategory } = req.query;

    let query = { reputationScore: { $gt: 0 } };

    let users = await User.find(query)
      .select('name reputationScore reputation skills location')
      .sort({ reputationScore: -1 })
      .limit(parseInt(limit))
      .lean();

    // If skill category specified, filter and re-sort
    if (skillCategory) {
      users = users
        .filter((user) => user.reputation?.skillEndorsements?.has(skillCategory))
        .sort(
          (a, b) =>
            (b.reputation?.skillEndorsements?.get(skillCategory)?.count || 0) -
            (a.reputation?.skillEndorsements?.get(skillCategory)?.count || 0)
        );
    }

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Verify a vouch (admin only)
 * PATCH /api/reputation/vouch/:vouchID/verify
 */
exports.verifyVouch = async (req, res) => {
  try {
    const { vouchID } = req.params;

    // Check if user is admin
    const admin = await User.findById(req.user.id || req.user._id);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can verify vouches',
      });
    }

    const vouch = await Vouch.findById(vouchID);
    if (!vouch) {
      return res.status(404).json({
        success: false,
        message: 'Vouch not found',
      });
    }

    if (vouch.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Vouch already verified',
      });
    }

    vouch.isVerified = true;
    vouch.verifiedAt = new Date();
    vouch.verifiedBy = req.user.id || req.user._id;
    await vouch.save();

    // Recalculate recipient's reputation
    await recalculateReputation(
      vouch.recipientID,
      'VOUCH_VERIFIED',
      vouchID,
      {},
      req.user.id || req.user._id
    );

    res.status(200).json({
      success: true,
      message: 'Vouch verified successfully',
      data: vouch,
    });
  } catch (error) {
    console.error('Error verifying vouch:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Get reputation transactions for audit trail
 * GET /api/reputation/transactions/:userID
 */
exports.getTransactions = async (req, res) => {
  try {
    const { userID } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const transactions = await ReputationTransaction.find({ userID })
      .populate('userID', 'name')
      .populate('initiatedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await ReputationTransaction.countDocuments({ userID });

    res.status(200).json({
      success: true,
      data: {
        transactions,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Get all vouches for a user
 * GET /api/reputation/vouches/:userID
 */
exports.getUserVouches = async (req, res) => {
  try {
    const { userID } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const vouches = await Vouch.find({ recipientID: userID })
      .populate('voterID', 'name phone')
      .populate('taskID', 'title description')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Vouch.countDocuments({ recipientID: userID });
    const verified = await Vouch.countDocuments({
      recipientID: userID,
      isVerified: true,
    });

    res.status(200).json({
      success: true,
      data: {
        vouches,
        total,
        verified,
        limit: parseInt(limit),
        skip: parseInt(skip),
      },
    });
  } catch (error) {
    console.error('Error fetching vouches:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Legacy endpoint for backward compatibility
exports.vouchForHelper = async (req, res) => {
  try {
    const task = await MicroTask.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.postedBy.toString() !== (req.user._id || req.user.id).toString()) {
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

    helper.reputationScore = (helper.reputationScore || 0) + 10;
    await helper.save();

    res.json({ message: 'Vouch successful', newReputation: helper.reputationScore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};