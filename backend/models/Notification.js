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