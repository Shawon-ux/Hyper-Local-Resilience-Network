const mongoose = require("mongoose");

const communityAlertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ["Minor", "Moderate", "Severe", "Extreme"],
      default: "Moderate",
    },
    urgency: {
      type: String,
      enum: ["Future", "Expected", "Immediate"],
      default: "Expected",
    },
    area: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CommunityAlert", communityAlertSchema);
