import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function updateRole() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Update user role to editor
    const user = await User.findOneAndUpdate(
      { email: '21ucs251@Inmiit.ac.in' },
      { role: 'editor' },
      { new: true }
    );

    if (user) {
      console.log('✅ Role updated successfully!');
      console.log('Email:', user.email);
      console.log('Username:', user.username);
      console.log('New Role:', user.role);
      console.log('\n⚠️  Please logout and login again to see the changes!');
    } else {
      console.log('❌ User not found with email: 21ucs251@Inmiit.ac.in');
      console.log('\nAvailable users:');
      const allUsers = await User.find({}, 'email username role');
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (${u.username}) - ${u.role}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateRole();
