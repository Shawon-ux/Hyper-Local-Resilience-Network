const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const colors = require("colors");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

dotenv.config();
const connectDB = require("./config/db");

// Route Imports - MERGE ALL routes from both branches
const authRoutes = require("./routes/authRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const skillRoutes = require("./routes/skillRoutes");
const microTaskRoutes = require("./routes/microTaskRoutes");
const taskRoutes = require("./routes/taskRoutes");
const matchingRoutes = require("./routes/matchingRoutes");
const reputationRoutes = require("./routes/reputationRoutes");
const communityRoutes = require("./routes/communityRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const alertRoutes = require("./routes/alertRoutes");
const criticalRequestRoutes = require("./routes/criticalRequestRoutes");
const safeRoutes = require("./routes/safeRoutes");
const readinessRoutes = require("./routes/readinessRoutes");

const app = express();
const server = http.createServer(app);

// CORS configuration - Use environment variable with fallback
const allowedOrigins = (process.env.FRONTEND_URLS || "http://localhost:5173,http://localhost:8000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  }
});

app.set("io", io);
global.__io = io;

// Middleware
app.use(helmet());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate Limiter - Apply ONLY to API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Using main branch's higher limit for development
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api", limiter);

// Test routes
app.get("/", (req, res) => {
  res.send("Hyper Local Resilience Network API is running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is running" });
});

app.get("/api/db-status", (req, res) => {
  const state = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    status: states[state] || "unknown",
    message: state === 1 ? "MongoDB is connected" : "MongoDB is not connected",
  });
});

// API routes - MERGE ALL routes from both branches
app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/microtasks", microTaskRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/reputation", reputationRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/requests", criticalRequestRoutes);
app.use("/api/safe-status", safeRoutes);
app.use("/api/readiness", readinessRoutes);

// Socket.io - MERGED handlers
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`.green);
  
  // From sadia-final-plus
  socket.on("register", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`.blue);
  });
  
  // From main branch
  socket.on("register:user", (userId) => {
    if (!userId) return;
    socket.join(`user:${String(userId)}`);
    console.log(`User ${userId} registered to user room`.blue);
  });
  
  // Handle both naming conventions for compatibility
  socket.on("register:both", (userId) => {
    if (!userId) return;
    socket.join(userId);
    socket.join(`user:${String(userId)}`);
    console.log(`User ${userId} registered to both room types`.blue);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`.red);
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler (from sadia-final-plus - more robust)
app.use((err, req, res, next) => {
  console.error(err.stack?.red || err);

  res.status(err.status || 500).json({
    message: err.message || "Server error",
  });
});

// PORT configuration - Use env var with fallbacks
const PORT = process.env.PORT || 9457; // Default to 9457 for Vite proxy, but allow override

// Start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`.yellow.bold);
      console.log(`CORS enabled for: ${allowedOrigins.join(", ")}`.cyan);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:".red, error.message);
    process.exit(1);
  });