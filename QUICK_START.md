# Quick Start Guide

Get up and running with PulseGen in 5 minutes!

## Prerequisites
- Node.js (v18+)
- MongoDB (running locally or Atlas)
- FFmpeg installed

## Installation

```bash
# 1. Install all dependencies
npm run install-all

# 2. Configure backend
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT_SECRET

# 3. Start the application
cd ..
npm run dev
```

## First Steps

1. **Open the app**: http://localhost:5173
2. **Register**: Create your first account
3. **Login**: Use your credentials
4. **Upload**: Go to Upload page and upload a video
5. **Watch**: Monitor real-time processing progress
6. **Stream**: View your processed video

## Default Configuration

- Backend: http://localhost:5000
- Frontend: http://localhost:5173
- MongoDB: mongodb://localhost:27017/pulsegen

## Need Help?

- See [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) for detailed setup
- See [README.md](./README.md) for full documentation
- See [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) for API reference

---

**That's it! You're ready to go! 🚀**
