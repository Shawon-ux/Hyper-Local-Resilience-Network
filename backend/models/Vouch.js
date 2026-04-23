const mongoose = require('mongoose');

const vouchSchema = new mongoose.Schema(
  {
    voterID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Voter ID is required'],
    },
    recipientID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient ID is required'],
    },
    taskID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MicroTask',
      required: [true, 'Task ID is required'],
    },
    skillCategory: {
      type: String,
      required: [true, 'Skill category is required'],
      trim: true,
    },
    rating: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: [true, 'Rating is required'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
    isVerified: {
      type: Boolean,
      default: false, // Admin can verify vouches
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    transactionID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReputationTransaction',
    },
  },
  { timestamps: true }
);

// Index for efficient lookups
vouchSchema.index({ recipientID: 1, createdAt: -1 });
vouchSchema.index({ voterID: 1 });
vouchSchema.index({ taskID: 1 });
vouchSchema.index({ skillCategory: 1 });

module.exports = mongoose.model('Vouch', vouchSchema);
