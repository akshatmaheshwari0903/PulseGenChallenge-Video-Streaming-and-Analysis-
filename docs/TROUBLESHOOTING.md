# Troubleshooting Guide

## MongoDB Connection Issues

### Issue: "bad auth : authentication failed" (MongoDB Atlas)

**Symptoms:**
```
❌ MongoDB connection error: MongoServerError: bad auth : authentication failed
codeName: 'AtlasError'
```

**Solutions:**

#### 1. URL-Encode Your Password

If your password contains special characters, they must be URL-encoded in the connection string.

**Special characters that need encoding:**
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `&` → `%26`
- `=` → `%3D`
- `+` → `%2B`
- ` ` (space) → `%20`

**Example:**
- Original password: `P@ssw0rd#123`
- Encoded password: `P%40ssw0rd%23123`
- Connection string: `mongodb+srv://username:P%40ssw0rd%23123@cluster.mongodb.net/pulsegen`

**Quick encoding tool:**
- Use online URL encoder: https://www.urlencoder.org/
- Or use Node.js: `encodeURIComponent('your-password')`

#### 2. Verify Connection String Format

Your connection string should look like:
```
mongodb+srv://username:password@cluster.mongodb.net/database-name
```

**Common mistakes:**
- ❌ Missing `mongodb+srv://` prefix
- ❌ Wrong username or password
- ❌ Missing database name at the end
- ❌ Extra spaces or quotes

**Correct format:**
```env
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/pulsegen?retryWrites=true&w=majority
```

#### 3. Check MongoDB Atlas Settings

**Database Access:**
1. Go to MongoDB Atlas Dashboard
2. Click "Database Access" in the left menu
3. Verify your database user exists
4. Check if password is correct
5. Ensure user has appropriate permissions (at least "Read and write to any database")

**Network Access:**
1. Go to "Network Access" in MongoDB Atlas
2. Click "Add IP Address"
3. For development: Add `0.0.0.0/0` (allows all IPs - **not recommended for production**)
4. For production: Add your specific IP address
5. Wait a few minutes for changes to propagate

#### 4. Create a New Database User

If you're unsure about credentials:

1. **Create new user:**
   - Go to MongoDB Atlas → Database Access
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: Choose a simple username (e.g., `pulsegen_user`)
   - Password: Use a password **without special characters** (e.g., `SecurePass123`)
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

2. **Update your `.env`:**
   ```env
   MONGODB_URI=mongodb+srv://pulsegen_user:SecurePass123@cluster0.xxxxx.mongodb.net/pulsegen
   ```

#### 5. Test Connection String

You can test your connection string using MongoDB Compass or mongosh:

**Using MongoDB Compass:**
1. Download MongoDB Compass
2. Paste your connection string
3. Click "Connect"
4. If it works, the connection string is correct

**Using mongosh:**
```bash
mongosh "mongodb+srv://username:password@cluster.mongodb.net/pulsegen"
```

#### 6. Alternative: Use Local MongoDB

If you continue having issues with Atlas, you can use local MongoDB:

1. **Install MongoDB locally:**
   - Windows: Download from https://www.mongodb.com/try/download/community
   - Mac: `brew install mongodb-community`
   - Linux: Follow MongoDB installation guide

2. **Start MongoDB:**
   ```bash
   # Windows (if installed as service, it auto-starts)
   # Or manually:
   mongod
   
   # Mac/Linux
   sudo systemctl start mongod
   ```

3. **Update `.env`:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/pulsegen
   ```

### Issue: "MongoServerError: connection timed out"

**Solutions:**
- Check your internet connection
- Verify MongoDB Atlas cluster is running
- Check Network Access settings in Atlas
- Ensure firewall isn't blocking the connection

### Issue: "MongoParseError: Invalid connection string"

**Solutions:**
- Verify connection string format
- Check for typos in username/password
- Ensure no extra spaces or quotes
- Verify cluster name is correct

## Other Common Issues

### Issue: Port Already in Use

**Error:**
```
EADDRINUSE: address already in use :::5000
```

**Solutions:**
1. Change port in `.env`:
   ```env
   PORT=5001
   ```

2. Or kill the process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   
   # Mac/Linux
   lsof -ti:5000 | xargs kill
   ```

### Issue: FFmpeg Not Found

**Error:**
```
FFmpeg not found
```

**Solutions:**
1. Install FFmpeg:
   ```bash
   # Windows (Chocolatey)
   choco install ffmpeg
   
   # Mac
   brew install ffmpeg
   
   # Linux
   sudo apt-get install ffmpeg
   ```

2. Verify installation:
   ```bash
   ffmpeg -version
   ```

3. Ensure FFmpeg is in your system PATH

### Issue: CORS Errors

**Error:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions:**
1. Check `CORS_ORIGIN` in backend `.env`:
   ```env
   CORS_ORIGIN=http://localhost:5173
   ```

2. Ensure it matches your frontend URL exactly

3. Restart backend server after changing

### Issue: File Upload Fails

**Error:**
```
Upload failed
File too large
```

**Solutions:**
1. Check file size (max 500MB by default)
2. Verify file type is supported (MP4, MOV, AVI, WEBM)
3. Check disk space: `df -h` (Mac/Linux) or check drive (Windows)
4. Verify upload directory permissions

### Issue: Socket.io Connection Failed

**Error:**
```
Socket connection error
```

**Solutions:**
1. Verify backend is running
2. Check JWT token is valid
3. Verify `CORS_ORIGIN` in backend `.env`
4. Check browser console for specific errors
5. Ensure Socket.io server initialized (check backend logs)

## Getting Help

If you're still experiencing issues:

1. **Check logs:**
   - Backend console output
   - Browser console (F12)
   - MongoDB Atlas logs

2. **Verify configuration:**
   - All environment variables set correctly
   - Dependencies installed: `npm install`
   - MongoDB running/accessible

3. **Test components separately:**
   - Test MongoDB connection with Compass
   - Test API endpoints with Postman/curl
   - Test frontend separately

4. **Common checklist:**
   - [ ] MongoDB is running/accessible
   - [ ] Environment variables are set
   - [ ] Dependencies are installed
   - [ ] Ports are available
   - [ ] FFmpeg is installed
   - [ ] No firewall blocking connections

---

For more help, refer to:
- [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- [README.md](../README.md)
- MongoDB Atlas Documentation: https://docs.atlas.mongodb.com/
