const mongoose = require("mongoose");

const resourceOfferSchema = new mongoose.Schema(
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
    resourceName: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unit: {
      type: String,
      default: "items"
    },
    availabilityStart: {
      type: Date,
      required: true
    },
    availabilityEnd: {
      type: Date,
      required: true
    },
    usageConstraints: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["Available", "Reserved", "Unavailable"],
      default: "Available"
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResourceOffer", resourceOfferSchema);