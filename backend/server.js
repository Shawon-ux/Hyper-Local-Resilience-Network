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

// Route Imports
const authRoutes = require("./routes/authRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const criticalRequestRoutes = require("./routes/criticalRequestRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const alertRoutes = require("./routes/alertRoutes");
const readinessRoutes = require("./routes/readinessRoutes");
const safeRoutes = require("./routes/safeRoutes");
const matchingRoutes = require("./routes/matchingRoutes");

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

app.set("io", io);
global.__io = io;

// Middleware
app.use(helmet());

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Static Uploads
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use("/uploads", express.static(uploadsDir));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api", limiter);

// Base Routes
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

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/requests", criticalRequestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/readiness", readinessRoutes);
app.use("/api/safe-status", safeRoutes);
app.use("/api/matching", matchingRoutes);

// Socket.io Logic
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`.cyan);

  socket.on("register", (userId) => {
    if (!userId) return;

    socket.join(String(userId));
    socket.join(`user:${String(userId)}`);

    console.log(`User ${userId} joined socket rooms`.blue);
  });

  socket.on("register:user", (userId) => {
    if (!userId) return;

    socket.join(String(userId));
    socket.join(`user:${String(userId)}`);

    console.log(`User ${userId} joined user room`.blue);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`.red);
  });
});

// 404 Handler - must stay after all routes/static middleware
app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Start Server
const PORT = process.env.PORT || 9457;

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`.yellow.bold);
    });
  } catch (error) {
    console.log("Failed to start server: ".red, error);
  }
};

startServer();