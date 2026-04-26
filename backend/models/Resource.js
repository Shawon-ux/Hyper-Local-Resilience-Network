const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    unit: {
      type: String,
      enum: ["litters", "units", "kits", "packs", "items"],
      required: true,
      default: "items",
    },
    totalStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    consumed: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

resourceSchema.virtual("remaining").get(function remaining() {
  return Math.max(0, this.totalStock - this.consumed);
});

resourceSchema.virtual("percentageRemaining").get(function percentageRemaining() {
  if (this.totalStock === 0) return 0;
  return (this.remaining / this.totalStock) * 100;
});

resourceSchema.virtual("status").get(function status() {
  const percent = this.percentageRemaining;
  if (percent <= 20) return "High Demand";
  if (percent <= 50) return "Medium Demand";
  return "Low Demand";
});

resourceSchema.set("toJSON", { virtuals: true });
resourceSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Resource", resourceSchema);
