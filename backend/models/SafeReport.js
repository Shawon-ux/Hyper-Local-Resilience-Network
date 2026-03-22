const mongoose = require("mongoose");

const safeReportSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    community: {
      type: String,
      required: true,
      trim: true
    },
    emergencyDeclared: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ["Safe", "Unsafe"],
      required: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    note: {
      type: String,
      default: ""
    },
    validated: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SafeReport", safeReportSchema);