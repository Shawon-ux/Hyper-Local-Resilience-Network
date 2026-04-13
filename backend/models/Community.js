const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    joinRequests: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        requestedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Community', communitySchema);
