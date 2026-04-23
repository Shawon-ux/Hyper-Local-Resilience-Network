const mongoose = require('mongoose');

const reputationTransactionSchema = new mongoose.Schema(
  {
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    reason: {
      type: String,
      enum: [
        'VOUCH_EARNED',
        'VOUCH_REVOKED',
        'TASK_COMPLETION_BONUS',
        'MANUAL_ADJUSTMENT',
        'PENALTY',
        'ADMIN_ACTION',
      ],
      required: [true, 'Reason is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ['MicroTask', 'CriticalRequest', 'Vouch', 'User'],
      },
      entityID: mongoose.Schema.Types.ObjectId,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'reversed'],
      default: 'completed',
    },
    previousScore: {
      type: Number,
      required: true,
    },
    newScore: {
      type: Number,
      required: true,
    },
    metadata: {
      skillCategory: String,
      taskTitle: String,
      voucherName: String,
    },
    notes: String,
  },
  { timestamps: true }
);

// Index for efficient queries
reputationTransactionSchema.index({ userID: 1, createdAt: -1 });
reputationTransactionSchema.index({ reason: 1 });
reputationTransactionSchema.index({ status: 1 });
reputationTransactionSchema.index({ 'relatedEntity.entityID': 1 });

module.exports = mongoose.model('ReputationTransaction', reputationTransactionSchema);
