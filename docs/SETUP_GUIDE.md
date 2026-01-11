# Setup Guide

This guide will walk you through setting up the PulseGen application from scratch.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js (v18 or higher) installed
- [ ] MongoDB installed and running (or MongoDB Atlas account)
- [ ] FFmpeg installed
- [ ] Git installed (for cloning)
- [ ] A code editor (VS Code recommended)

## Step-by-Step Setup

### Step 1: Verify Prerequisites

**Check Node.js:**
```bash
node --version
# Should show v18.x.x or higher
```

**Check npm:**
```bash
npm --version
# Should show 9.x.x or higher
```

**Check MongoDB:**
```bash
mongod --version
# Or check MongoDB Compass connection
```

**Check FFmpeg:**
```bash
ffmpeg -version
# Should show version information
```

### Step 2: Clone and Navigate

```bash
# Clone the repository (or navigate to project directory)
cd PulseGenChallenge
```

### Step 3: Install Dependencies

**Option A: Install all at once (recommended)**
```bash
npm run install-all
```

**Option B: Install separately**
```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..

# Frontend dependencies
cd frontend
npm install
cd ..
```

### Step 4: Configure Backend

1. **Create environment file:**
```bash
cd backend
cp .env.example .env
```

2. **Edit `.env` file:**
```bash
# Use your preferred text editor
# Windows: notepad .env
# Mac/Linux: nano .env or code .env
```

3. **Configure MongoDB:**
   - **Local MongoDB**: Use `mongodb://localhost:27017/pulsegen`
   - **MongoDB Atlas**: 
     - Create a cluster at https://www.mongodb.com/cloud/atlas
     - Get connection string
     - Replace `<password>` with your password
     - Example: `mongodb+srv://username:password@cluster.mongodb.net/pulsegen`

4. **Set JWT Secret:**
   - Generate a secure random string
   - Or use: `openssl rand -base64 32`
   - Update `JWT_SECRET` in `.env`

5. **Verify configuration:**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_secret_key
JWT_EXPIRE=7d
MAX_FILE_SIZE=500000000
UPLOAD_PATH=./uploads/videos
PROCESSED_PATH=./uploads/processed
CORS_ORIGIN=http://localhost:5173
```

### Step 5: Create Upload Directories

The app will create these automatically, but you can create them manually:

```bash
# From project root
mkdir -p backend/uploads/videos
mkdir -p backend/uploads/processed
```

### Step 6: Start MongoDB

**Local MongoDB:**
```bash
# Windows (if installed as service, it should auto-start)
# Or start manually:
mongod

# Mac/Linux
sudo systemctl start mongod
# Or
mongod
```

**MongoDB Atlas:**
- No local setup needed, just ensure connection string is correct

### Step 7: Start the Application

**Development Mode (recommended for first run):**

```bash
# From project root
npm run dev
```

This starts both backend and frontend concurrently.

**Or start separately:**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### Step 8: Verify Installation

1. **Check Backend:**
   - Open http://localhost:5000/api/health
   - Should see: `{"status":"ok","message":"Server is running"}`

2. **Check Frontend:**
   - Open http://localhost:5173
   - Should see the login/register page

3. **Check MongoDB Connection:**
   - Backend console should show: `✅ Connected to MongoDB`

### Step 9: Create First User

1. Navigate to http://localhost:5173/register
2. Fill in registration form:
   - Username: `admin`
   - Email: `admin@example.com`
   - Password: `password123` (or your choice)
3. Click "Create account"
4. You'll be logged in automatically

### Step 10: Test the Application

1. **Login/Logout**: Test authentication flow
2. **Upload Video**: 
   - Navigate to Upload page
   - Select a video file (MP4 recommended)
   - Fill in details and upload
   - Watch real-time processing progress
3. **View Library**: Browse uploaded videos
4. **Stream Video**: Click on a completed video to play
5. **Create Category**: Add a custom category
6. **Filter Videos**: Test search and filter features

## Troubleshooting

### Issue: MongoDB Connection Failed

**Symptoms:**
- Backend shows: `❌ MongoDB connection error`

**Solutions:**
1. Verify MongoDB is running: `mongod --version`
2. Check connection string in `.env`
3. For MongoDB Atlas: Check network access (allow all IPs for testing)
4. Verify credentials are correct

### Issue: FFmpeg Not Found

**Symptoms:**
- Video processing fails
- Error: `FFmpeg not found`

**Solutions:**
1. Install FFmpeg (see Prerequisites)
2. Verify installation: `ffmpeg -version`
3. On Windows: Add FFmpeg to PATH
4. Restart terminal/application

### Issue: Port Already in Use

**Symptoms:**
- Error: `EADDRINUSE: address already in use`

**Solutions:**
1. Change port in backend `.env`: `PORT=5001`
2. Or kill process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   
   # Mac/Linux
   lsof -ti:5000 | xargs kill
   ```

### Issue: CORS Errors

**Symptoms:**
- Browser console shows CORS errors
- API requests fail

**Solutions:**
1. Verify `CORS_ORIGIN` in backend `.env` matches frontend URL
2. Default should be: `http://localhost:5173`
3. Restart backend server after changing

### Issue: File Upload Fails

**Symptoms:**
- Upload progress stops
- Error message appears

**Solutions:**
1. Check file size (max 500MB)
2. Verify file type is supported (MP4, MOV, AVI, WEBM)
3. Check disk space: `df -h` (Mac/Linux) or check drive (Windows)
4. Verify upload directory permissions

### Issue: Socket.io Connection Failed

**Symptoms:**
- Real-time updates not working
- Console shows connection errors

**Solutions:**
1. Verify backend is running
2. Check JWT token is valid
3. Verify `CORS_ORIGIN` includes frontend URL
4. Check browser console for specific errors

## Development Tips

### Hot Reload
- Backend: Uses nodemon (auto-restarts on file changes)
- Frontend: Vite HMR (instant updates)

### Debugging
- Backend: Use `console.log()` or debugger
- Frontend: Use React DevTools and browser DevTools
- MongoDB: Use MongoDB Compass for database inspection

### Environment Variables
- Never commit `.env` files
- Use `.env.example` as template
- Different `.env` files for different environments

### Database Reset
If you need to reset the database:
```bash
# Connect to MongoDB
mongosh

# Switch to database
use pulsegen

# Drop database (WARNING: Deletes all data)
db.dropDatabase()
```

## Next Steps

After successful setup:

1. **Read Documentation:**
   - [README.md](../README.md) - Overview and features
   - [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture

2. **Explore Features:**
   - Upload videos
   - Test real-time processing
   - Try different user roles
   - Test filtering and search

3. **Customize:**
   - Modify styling (Tailwind CSS)
   - Add new features
   - Configure for production

## Production Deployment

For production deployment:

1. **Environment:**
   - Set `NODE_ENV=production`
   - Use secure `JWT_SECRET`
   - Configure production MongoDB
   - Set proper `CORS_ORIGIN`

2. **Build Frontend:**
   ```bash
   cd frontend
   npm run build
   ```

3. **Security:**
   - Enable HTTPS
   - Add rate limiting
   - Configure security headers
   - Use environment variable management

4. **Monitoring:**
   - Set up logging
   - Add error tracking
   - Monitor performance

---

**Need Help?** Refer to the main README.md or create an issue in the repository.
