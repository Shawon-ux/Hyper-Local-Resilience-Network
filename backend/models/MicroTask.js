const mongoose = require('mongoose');

const microTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: "" }, // Human-readable address
    },
    urgency: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    suggestedSkills: [{ type: String }], // skills suggested by Gemini
    selectedSkills: [{ type: String }], // skills chosen by the user for matching
    audit: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      aiSuggestedSkills: [{ type: String }],
      selectedSkills: [{ type: String }],
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'completed', 'cancelled'],
      default: 'open',
    },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    helper: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who accepted
    completedAt: Date,
    vouched: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MicroTask', microTaskSchema);
