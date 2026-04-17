const mongoose = require('mongoose');

const criticalRequestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title for the request'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description for the request'],
      trim: true,
    },
    urgency: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'in_progress', 'fulfilled'],
      default: 'pending',
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    helper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    location: {
      type: String,
      required: [true, 'Please provide a location name'],
      trim: true,
    },
    exactLocation: {
      type: String,
      required: [true, 'Please provide an exact address for the request'],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, 'Please provide a contact number for the requester'],
      trim: true,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CriticalRequest', criticalRequestSchema);
