const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    applicantPhone: {
      type: String,
      default: "",
      trim: true,
    },
    applicantAddress: {
      type: String,
      required: true,
      trim: true,
    },
    requestedQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    approvedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: true }
);

const resourceOfferSchema = new mongoose.Schema(
  {
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    community: {
      type: String,
      required: true,
      trim: true,
    },
    areaName: {
      type: String,
      required: true,
      trim: true,
    },
    resourceName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      default: "items",
    },
    availabilityStart: {
      type: Date,
      required: true,
    },
    availabilityEnd: {
      type: Date,
      required: true,
    },
    usageConstraints: {
      type: String,
      default: "",
    },
    photoUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Available", "Reserved", "Unavailable"],
      default: "Available",
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    applications: [applicationSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResourceOffer", resourceOfferSchema);