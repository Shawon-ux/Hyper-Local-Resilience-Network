const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const DB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hyperlocal';

const CHIPCHAPA_LAT = 23.8103;
const CHIPCHAPA_LNG = 90.4125;
const EARTH_RADIUS = 6371000; // in meters
const RADIUS_LIMIT = 500; // 500 meters

// Function to generate a random coordinate within a 500m radius
const generateRandomCoordinates = (centerLat, centerLng, radiusInMeters) => {
  const r = radiusInMeters / EARTH_RADIUS;
  const w = r * Math.sqrt(Math.random());
  const t = 2 * Math.PI * Math.random();
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  
  const latDelta = (y * 180) / Math.PI;
  const lngDelta = (x * 180) / Math.PI / Math.cos((centerLat * Math.PI) / 180);
  
  return {
    lat: centerLat + latDelta,
    lng: centerLng + lngDelta,
  };
};

const skillSets = [
  [{ name: 'Plumbing', level: 'expert', available: true }],
  [{ name: 'First-aid', level: 'intermediate', available: true }],
  [{ name: 'Carpentry', level: 'expert', available: true }],
  [{ name: 'Electrical Repair', level: 'expert', available: true }],
  [{ name: 'Moving', level: 'beginner', available: true }],
  [{ name: 'Cooking', level: 'expert', available: true }],
  [{ name: 'Baby Sitting', level: 'intermediate', available: true }],
  [{ name: 'Pet Care', level: 'expert', available: true }],
  [{ name: 'Cleaning', level: 'intermediate', available: true }],
  [{ name: 'Mechanic', level: 'expert', available: true }]
];

const seedResidents = async () => {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to Database');

    const usersToInsert = [];

    for (let i = 0; i < 10; i++) {
      const location = generateRandomCoordinates(CHIPCHAPA_LAT, CHIPCHAPA_LNG, RADIUS_LIMIT);
      
      usersToInsert.push({
        name: `Resident ${i + 1}`,
        email: `resident${i + 1}@example.com`,
        phone: `+880170000000${i}`,
        password: 'password123', // Will be hashed by pre-save hook
        address: `ChipChapa Block ${String.fromCharCode(65 + i)}`,
        location: {
          lat: location.lat,
          lng: location.lng,
        },
        skills: skillSets[i],
        availabilityStatus: true,
        reputationScore: Math.floor(Math.random() * 50) + 50, // Between 50 and 100
      });
    }

    // Since we need the pre-save hook to hash the password, we use create or save on model instances
    for (const userData of usersToInsert) {
      const exists = await User.findOne({ email: userData.email });
      if (!exists) {
        await User.create(userData);
        console.log(`Created user: ${userData.name}`);
      } else {
        console.log(`User already exists: ${userData.name}`);
      }
    }

    console.log('Successfully seeded 10 residents near ChipChapa.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedResidents();
