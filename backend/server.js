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

dotenv.config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const safeRoutes = require("./routes/safeRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const skillRoutes = require("./routes/skillRoutes");
const microTaskRoutes = require("./routes/microTaskRoutes");
const matchingRoutes = require("./routes/matchingRoutes");
const reputationRoutes = require("./routes/reputationRoutes");
const alertRoutes = require("./routes/alertRoutes");

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
});

app.set("io", io);

app.use(helmet());

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api", limiter);

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

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/safe-status", safeRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/microtasks", microTaskRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/reputation", reputationRoutes);
app.use("/api/alerts", alertRoutes);

// Socket.io
io.on("connection", (socket) => {
  console.log(`A user connected: ${socket.id}`.green);

  socket.on("disconnect", () => {
    console.log(`A user disconnected: ${socket.id}`.red);
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack?.red || err);

  res.status(err.status || 500).json({
    message: err.message || "Server error",
  });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`.yellow.bold);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:".red, error.message);
    process.exit(1);
  });