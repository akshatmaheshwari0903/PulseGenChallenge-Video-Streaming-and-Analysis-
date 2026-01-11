# How to Change User Role

## Quick Fix: Update Role via MongoDB

### Option 1: Using MongoDB Compass (Easiest)

1. **Open MongoDB Compass**
2. **Connect** to your cluster: `mongodb+srv://21ucs251:3huefugwaugd@cluster0.rbgtq6q.mongodb.net/pulsegen`
3. **Navigate** to the `users` collection
4. **Find** your user document (search by email: `21ucs251@Inmiit.ac.in`)
5. **Edit** the `role` field:
   - Change from `"viewer"` to `"editor"` or `"admin"`
6. **Save** the document
7. **Refresh** your browser or **logout and login again**

### Option 2: Using MongoDB Shell (mongosh)

```bash
# Connect to your database
mongosh "mongodb+srv://21ucs251:3huefugwaugd@cluster0.rbgtq6q.mongodb.net/pulsegen"

# Update your user role to editor
db.users.updateOne(
  { email: "21ucs251@Inmiit.ac.in" },
  { $set: { role: "editor" } }
)

# Or update to admin
db.users.updateOne(
  { email: "21ucs251@Inmiit.ac.in" },
  { $set: { role: "admin" } }
)

# Verify the change
db.users.findOne({ email: "21ucs251@Inmiit.ac.in" })
```

### Option 3: Using Node.js Script

Create a file `update-role.js` in the backend directory:

```javascript
import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function updateRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOneAndUpdate(
      { email: '21ucs251@Inmiit.ac.in' },
      { role: 'editor' },
      { new: true }
    );

    if (user) {
      console.log('✅ Role updated successfully!');
      console.log('User:', user.email, 'Role:', user.role);
    } else {
      console.log('❌ User not found');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

updateRole();
```

Run it:
```bash
cd backend
node update-role.js
```

## Option 2: Create an Admin User First

1. **Register a new user** with admin role using the API directly:

```bash
# Using curl or Postman
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@example.com",
  "password": "admin123",
  "role": "admin"
}
```

2. **Login** as admin
3. **Go to Users page** (admin only)
4. **Change your original user's role** to editor or admin

## Option 3: Change Default Role (For Future Users)

If you want new users to default to "editor" instead of "viewer", update the registration route:

**File:** `backend/routes/auth.js`

**Change line 60:**
```javascript
// From:
role: role || 'viewer',

// To:
role: role || 'editor',
```

## Role Permissions

- **Viewer**: Can view videos only (no upload)
- **Editor**: Can upload, edit, and manage videos + categories
- **Admin**: Full access including user management

---

**After changing your role, logout and login again to see the Upload option in the navigation!**
