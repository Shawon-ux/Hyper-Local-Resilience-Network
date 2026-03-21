const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const colors = require('colors');
const cookieParser = require("cookie-parser");

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/db');

// Create Express app
const app = express();



const authRoutes = require('./routes/authRoutes');
// const skillRoutes = require('./routes/skillRoutes');
// const microTaskRoutes = require('./routes/microTaskRoutes');
// const matchingRoutes = require('./routes/matchingRoutes');
// const reputationRoutes = require('./routes/reputationRoutes');




// Middleware
app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser())
app.use(morgan('dev'));

// basicAuth
app.use('/api/auth', authRoutes);



// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is running' });
});

// New route to check DB status
app.get('/api/db-status', (req, res) => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  res.json({ 
    status: states[state] || 'unknown',
    message: state === 1 ? 'MongoDB is connected' : 'MongoDB is not connected'
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`.yellow.bold);
  });
});
