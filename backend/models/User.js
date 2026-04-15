const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please add a phone number'],
      unique: true,
    },
    address: {
      type: String,
      required: [true, 'Please add an address'],
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    skills: [
      {
        name: { type: String, required: true },
        level: {
          type: String,
          enum: ['beginner', 'intermediate', 'expert'],
          default: 'intermediate',
        },
        available: { type: Boolean, default: true },
      },
    ],
    skills: [skillSchema],
    reputationScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);