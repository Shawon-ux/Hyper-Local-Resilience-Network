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
const notificationRoutes = require("./routes/notificationRoutes");
const alertRoutes = require("./routes/alertRoutes");
const readinessRoutes = require("./routes/readinessRoutes");

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = "http://localhost:5173";

// Socket.io Setup
const io = new Server(server, {
  cors: { origin: FRONTEND_URL, credentials: true }
});
app.set("io", io);
global.__io = io;

// Middleware
app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP for local dev/maps
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan("dev"));

// Rate Limiter - Apply ONLY to API, but keep it high for dev
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, 
  message: "Too many requests."
});
app.use("/api", limiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes); 
app.use("/api/notifications", notificationRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/readiness", readinessRoutes);

// Static Files
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));

// Socket Logic
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`.cyan);

  socket.on("register:user", (userId) => {
    if (!userId) return;
    socket.join(`user:${String(userId)}`);
  });
});

// START SERVER
const PORT = 9457; // Forced to match your Vite Proxy
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`.yellow.bold);
    });
  } catch (error) {
    console.log("Failed to start server: ".red, error);
  }
};

startServer();
