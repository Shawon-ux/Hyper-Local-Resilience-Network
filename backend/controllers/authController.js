const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

/* ---------------------------------------------------
   GENERATE JWT TOKEN
--------------------------------------------------- */
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET is missing in production!'); })() : "secret123"),
    { expiresIn: "30d" }
  );
};

/* ---------------------------------------------------
   REGISTER USER
   POST /api/auth/register
--------------------------------------------------- */
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      name,
      email,
      phone,
      address,
      location,
      password,
    } = req.body;

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    const normalizedPhone = String(phone || "").trim();

    /* CHECK EXISTING USER */
    const userExists = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { phone: normalizedPhone },
      ],
    });

    if (userExists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    /* CREATE USER */
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      address,
      location,
      password,
    });

    const token = generateToken(user._id);

    /* COOKIE */
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        location: user.location,
        isAdmin: user.isAdmin,
        crisisAlertActive: user.crisisAlertActive,
        skills: user.skills || [],
        reputationScore: user.reputationScore || 0,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      message: "Server error during registration",
    });
  }
};

/* ---------------------------------------------------
   LOGIN USER
   POST /api/auth/login
--------------------------------------------------- */
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    /* FIND USER */
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    /* CHECK PASSWORD */
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    /* COOKIE */
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        location: user.location,
        isAdmin: user.isAdmin,
        crisisAlertActive: user.crisisAlertActive,
        skills: user.skills || [],
        reputationScore: user.reputationScore || 0,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Server error during login",
    });
  }
};

/* ---------------------------------------------------
   LOGOUT
--------------------------------------------------- */
exports.logout = (req, res) => {
  res.clearCookie("token");

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
};

/* ---------------------------------------------------
   GET CURRENT USER
--------------------------------------------------- */
exports.getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    return res.json({
      success: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        address: req.user.address,
        location: req.user.location,
        isAdmin: req.user.isAdmin,
        crisisAlertActive: req.user.crisisAlertActive,
        skills: req.user.skills || [],
        reputationScore: req.user.reputationScore || 0,
      },
    });
  } catch (error) {
    console.error("GETME ERROR:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};