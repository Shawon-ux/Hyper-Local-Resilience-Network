require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    const existing = await User.findOne({
      email: 'admin@hyperlocal.com',
    });

    if (existing) {
      console.log('Dummy admin already exists');
      console.log('Email: admin@hyperlocal.com');
      console.log('Password: admin123');
      process.exit(0);
    }

    const admin = new User({
      name: 'Demo Admin',
      email: 'admin@hyperlocal.com',
      phone: '01700000000',
      address: 'Dhaka Admin Hub',
      location: 'Dhaka, Bangladesh',
      password: 'admin123',
      isAdmin: true,
      skills: [],
      reputationScore: 100,
    });

    await admin.save();

    console.log('Dummy admin created successfully');
    console.log('Email: admin@hyperlocal.com');
    console.log('Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error('Failed to seed admin:', error.message);
    process.exit(1);
  }
}

seedAdmin();