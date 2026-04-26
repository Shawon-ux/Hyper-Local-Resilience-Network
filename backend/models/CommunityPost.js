const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema(
  {
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['normal', 'emergency'], default: 'normal', required: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'not_possible', 'acknowledged', 'completed'], default: 'pending' },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

communityPostSchema.index({ community: 1, createdAt: -1 });

module.exports = mongoose.model('CommunityPost', communityPostSchema);