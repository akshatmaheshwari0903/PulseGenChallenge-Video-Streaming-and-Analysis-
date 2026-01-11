# PulseGen - Video Upload, Processing, and Streaming Application

A comprehensive full-stack application for uploading, processing, and streaming videos with real-time progress tracking, content sensitivity analysis, and role-based access control.

## 🚀 Features

### Core Functionality
- **Video Upload**: Secure video file upload with validation and progress tracking
- **Real-Time Processing**: Live updates on video processing status using Socket.io
- **Content Analysis**: Automated sensitivity detection (safe/flagged classification)
- **Video Streaming**: HTTP range request support for efficient video playback
- **Multi-Tenant Architecture**: Complete user isolation and data segregation
- **Role-Based Access Control (RBAC)**: Viewer, Editor, and Admin roles with appropriate permissions

### Advanced Features
- **Metadata Filtering**: Search by upload date, file size, duration, status, and sensitivity
- **Custom Categories**: User-defined video categorization system
- **Video Compression**: Automatic optimization for streaming
- **Real-Time Dashboard**: Live statistics and recent videos
- **Responsive Design**: Cross-platform compatibility and intuitive UX

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher - LTS version recommended)
- **MongoDB** (v6 or higher) or MongoDB Atlas account
- **FFmpeg** (for video processing)
- **npm** or **yarn** package manager

### Installing FFmpeg

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd PulseGenChallenge
```

### 2. Install Dependencies

Install root dependencies:
```bash
npm install
```

Install backend dependencies:
```bash
cd backend
npm install
cd ..
```

Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

Or use the convenience script:
```bash
npm run install-all
```

### 3. Environment Configuration

Create a `.env` file in the `backend` directory:
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/pulsegen
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pulsegen

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# File Upload Configuration
MAX_FILE_SIZE=500000000
UPLOAD_PATH=./uploads/videos
PROCESSED_PATH=./uploads/processed

# Socket.io Configuration
CORS_ORIGIN=http://localhost:5173
```

### 4. Create Upload Directories

The application will create these automatically, but you can create them manually:
```bash
mkdir -p backend/uploads/videos
mkdir -p backend/uploads/processed
```

## 🏃 Running the Application

### Development Mode

Run both backend and frontend concurrently:
```bash
npm run dev
```

Or run them separately:

**Backend:**
```bash
npm run server
# or
cd backend && npm run dev
```

**Frontend:**
```bash
npm run client
# or
cd frontend && npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

### Production Mode

**Build frontend:**
```bash
cd frontend
npm run build
```

**Start backend:**
```bash
cd backend
npm start
```

## 📖 Usage Guide

### 1. User Registration/Login

1. Navigate to the registration page
2. Create an account with username, email, and password
3. Default role is "viewer" (can be changed by admin)
4. Login with your credentials

### 2. Video Upload (Editor/Admin)

1. Navigate to "Upload" in the navigation
2. Select a video file (MP4, MOV, AVI, WEBM - max 500MB)
3. Fill in video details:
   - Title (required)
   - Description (optional)
   - Category (select from existing or use "uncategorized")
   - Tags (comma-separated)
4. Click "Upload Video"
5. Monitor real-time upload and processing progress

### 3. Video Library

1. Navigate to "Video Library"
2. Browse all videos in your organization
3. Use filters to search by:
   - Status (completed, processing, flagged)
   - Sensitivity (safe, flagged)
   - Category
   - Upload date range
   - File size range
   - Duration range
4. Sort by date, size, or duration
5. Click on any video to view details and stream

### 4. Video Playback

1. Click on a video from the library
2. Video player will load (for completed/flagged videos)
3. Processing videos show real-time progress
4. Edit video metadata (Editor/Admin only)
5. Delete videos (Editor/Admin only)

### 5. Categories Management (Editor/Admin)

1. Navigate to "Categories"
2. Create new categories with:
   - Name
   - Description
   - Color (for visual identification)
3. Delete categories (videos will be moved to "uncategorized")

### 6. User Management (Admin Only)

1. Navigate to "Users"
2. View all users in your organization
3. Change user roles (Viewer, Editor, Admin)

## 🏗️ Architecture

### Backend Structure
```
backend/
├── models/          # MongoDB models (User, Video, Category)
├── routes/          # API route handlers
├── middleware/      # Authentication, authorization, upload
├── utils/           # Utility functions (JWT, video processing)
├── socket/          # Socket.io handlers
├── uploads/         # Video storage (gitignored)
└── server.js        # Express server entry point
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/  # Reusable components
│   ├── contexts/    # React contexts (Auth, Socket)
│   ├── pages/       # Page components
│   ├── utils/       # Utility functions
│   └── App.jsx      # Main app component
├── public/          # Static assets
└── index.html       # HTML entry point
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for password security
- **Role-Based Access Control**: Granular permissions
- **Multi-Tenant Isolation**: Organization-based data segregation
- **Input Validation**: Express-validator for request validation
- **File Type Validation**: Strict video file type checking
- **File Size Limits**: Configurable upload limits

## 📡 API Documentation

See [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) for detailed API endpoints.

## 🧪 Testing

Basic testing can be performed manually:

1. **Authentication**: Register, login, logout
2. **Video Upload**: Upload various video formats
3. **Processing**: Monitor real-time processing updates
4. **Streaming**: Play videos with range requests
5. **RBAC**: Test role-based permissions
6. **Filtering**: Test all filter combinations

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod` or check MongoDB Atlas connection string
- Verify `MONGODB_URI` in `.env` file

### FFmpeg Not Found
- Install FFmpeg (see Prerequisites)
- Verify installation: `ffmpeg -version`
- On Windows, ensure FFmpeg is in PATH

### Port Already in Use
- Change `PORT` in backend `.env`
- Change Vite port in `frontend/vite.config.js`

### Video Upload Fails
- Check file size (max 500MB)
- Verify file type is supported
- Check disk space in upload directory

### Socket.io Connection Issues
- Verify CORS_ORIGIN matches frontend URL
- Check backend server is running
- Verify JWT token is valid

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/pulsegen |
| `JWT_SECRET` | Secret key for JWT tokens | (required) |
| `JWT_EXPIRE` | JWT token expiration | 7d |
| `MAX_FILE_SIZE` | Maximum upload size in bytes | 500000000 |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:5173 |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of a coding challenge/assignment.

## 👥 Roles and Permissions

### Viewer
- View videos in organization
- Stream completed videos
- View dashboard statistics

### Editor
- All Viewer permissions
- Upload videos
- Edit own videos
- Delete own videos
- Manage categories

### Admin
- All Editor permissions
- Manage all videos (edit/delete any)
- User management
- Role assignment

## 🔮 Future Enhancements

- Advanced ML-based content analysis
- Video thumbnail generation
- Batch upload support
- Video editing capabilities
- Advanced analytics dashboard
- CDN integration for better streaming
- Email notifications
- Video sharing and collaboration

## 📞 Support

For issues or questions, please refer to the documentation or create an issue in the repository.

---

**Built with ❤️ using Node.js, Express, MongoDB, React, and Vite**
