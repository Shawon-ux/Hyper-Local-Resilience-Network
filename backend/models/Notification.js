const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "RESOURCE_APPROVED_FOR_APPLICANT",
        "RESOURCE_APPROVED_FOR_SHARER",
        "RESOURCE_REJECTED_FOR_APPLICANT",
        "REQUEST_APPROVED_AVAILABLE",
        "REQUEST_PENDING_APPROVAL",
        "REQUEST_APPROVED_FOR_REQUESTER",
        "REQUEST_REJECTED_FOR_REQUESTER",
        "PROXIMITY_MATCH_FOUND_FOR_REQUESTER",
        "PROXIMITY_MATCH_FOUND_FOR_OWNER",
        "PROACTIVE_RESOURCE_READINESS",
        "READINESS_GAP_ALERT",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    meta: {
      resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ResourceOffer",
        default: null,
      },
      applicantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CriticalRequest",
        default: null,
      },
      alertId: {
        type: String,
        default: null,
      },
      alertTitle: {
        type: String,
        default: null,
      },
      resourceName: {
        type: String,
        default: null,
      },
      resourceCategory: {
        type: String,
        default: null,
      },
      urgency: {
        type: String,
        default: null,
      },
      outreachStatus: {
        type: String,
        default: null,
      },
      requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
