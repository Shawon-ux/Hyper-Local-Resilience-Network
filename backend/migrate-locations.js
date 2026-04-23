/**
 * Migration script to convert location field from string to object format
 * Run this once to migrate all existing user documents
 * Usage: node migrate-locations.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const migrateLocations = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all users with location as string
    const users = await User.find({
      $expr: { $eq: [{ $type: '$location' }, 'string'] }
    });

    console.log(`Found ${users.length} users with string location format`);

    if (users.length === 0) {
      console.log('No migrations needed!');
      await mongoose.disconnect();
      return;
    }

    // Convert each user's location to object format
    for (const user of users) {
      try {
        // Default Dhaka location if we can't parse
        const defaultLocation = { lat: 23.8103, lng: 90.4125 };
        
        let newLocation = defaultLocation;
        
        // Try to parse location string if it contains coordinates
        if (user.location && typeof user.location === 'string') {
          const coordMatch = user.location.match(/[\d.-]+/g);
          if (coordMatch && coordMatch.length >= 2) {
            newLocation = {
              lat: parseFloat(coordMatch[0]),
              lng: parseFloat(coordMatch[1])
            };
          }
        }

        // Update user directly
        await User.updateOne(
          { _id: user._id },
          { $set: { location: newLocation } }
        );
        
        console.log(`✓ Migrated user ${user.email}: location converted to ${JSON.stringify(newLocation)}`);
      } catch (err) {
        console.error(`✗ Failed to migrate user ${user.email}:`, err.message);
      }
    }

    console.log('\n✓ Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

migrateLocations();
