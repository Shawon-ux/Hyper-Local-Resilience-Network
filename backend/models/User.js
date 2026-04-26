const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Skill schema (from sadia-final-plus)
const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Please add a skill name'], trim: true },
    category: { type: String, trim: true, default: 'General' },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert'],
      default: 'intermediate',
    },
    available: { type: Boolean, default: true },
    yearsOfExperience: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: mongoose.Schema.Types.Decimal128, default: 0.0 },
    lastVerified: { type: Date, default: Date.now },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Main user schema (merged from both branches)
const userSchema = new mongoose.Schema(
  {
    // Basic info (from both)
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Please add a phone number"],
      unique: true,
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Please add an address"],
    },
    location: {
      lat: {
        type: Number,
        required: [true, 'Please add latitude'],
      },
      lng: {
        type: Number,
        required: [true, 'Please add longitude'],
      },
      type: {
        type: String,
        default: "Point",
      },
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: 6,
      select: false,
    },
    
    // Skills and basic reputation (from sadia-final-plus)
    skills: [skillSchema],
    reputationScore: { type: Number, default: 0 },
    
    // Admin and crisis features (from main)
    isAdmin: {
      type: Boolean,
      default: false,
    },
    crisisAlertActive: {
      type: Boolean,
      default: true,
    },
    
    // Advanced reputation system (from main)
    reputation: {
      totalVouches: { type: Number, default: 0 },
      skillEndorsements: {
        type: Map,
        of: {
          count: { type: Number, default: 0 },
          averageRating: { type: Number, default: 0 },
          lastUpdated: { type: Date, default: Date.now },
        },
        default: new Map(),
      },
      averageRating: { type: Number, default: 0 },
      isVerified: { type: Boolean, default: false },
      verificationDate: Date,
      transactionHistory: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ReputationTransaction',
        },
      ],
      lastVouchDate: Date,
      trustScore: { type: Number, default: 0 },
    },
    
    // Availability and socket (from main)
    availabilityStatus: { type: Boolean, default: true },
    socketId: {
      type: String,
      default: null,
    },
    
    // Emergency safety features (from main)
    safetyStatus: {
      type: String,
      enum: ["Safe", "In Danger", "Evacuated", "Unknown"],
      default: "Unknown",
    },
    lastEmergencyCheckIn: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Add index for reputationScore (from main)
userSchema.index({ reputationScore: -1 });

/**
 * PRE-SAVE MIDDLEWARE
 */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/* Compare password */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);