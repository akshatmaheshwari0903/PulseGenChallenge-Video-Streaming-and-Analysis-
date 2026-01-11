# Sightengine API Setup Guide

Sightengine is a content moderation API that can detect nudity, violence, and other explicit content in images. It has a **free tier** (1,000 requests/month) and is simpler to set up than Google Cloud Vision.

## Quick Setup (5 minutes)

### Step 1: Sign Up for Sightengine

1. Go to [https://sightengine.com/](https://sightengine.com/)
2. Click **"Sign Up"** or **"Get Started"**
3. Create a free account (no credit card required for free tier)
4. Verify your email address

### Step 2: Get Your API Credentials

1. After logging in, go to your **Dashboard**
2. You'll see your **API User** and **API Secret**
3. Copy both values

### Step 3: Add Credentials to `.env` File

1. Open `backend/.env` file
2. Add these lines (replace with your actual credentials):

```env
SIGHTENGINE_API_USER=your_api_user_here
SIGHTENGINE_API_SECRET=your_api_secret_here
```

3. Save the file
4. Restart your backend server

### Step 4: Test the Setup

1. Upload a test video
2. Check the backend console logs - you should see:
   ```
   Extracting X frames for analysis (API: Sightengine)...
   ```
3. The video will be analyzed for explicit content

## How It Works

- **Frame Extraction**: The system extracts frames from your video (every 10 seconds, max 10 frames)
- **API Analysis**: Each frame is sent to Sightengine API for analysis
- **Detection**: Sightengine detects:
  - Nudity (adult content)
  - Violence
  - Offensive content
  - Weapons

## Free Tier Limits

- **1,000 requests/month** (free tier)
- Each video uses ~10 requests (one per frame)
- So you can analyze ~100 videos/month for free

## Upgrade Options

If you need more:
- **Starter**: $9/month - 10,000 requests
- **Professional**: $49/month - 100,000 requests
- **Enterprise**: Custom pricing

## Troubleshooting

### "No content detection API configured" warning

- Make sure you've added `SIGHTENGINE_API_USER` and `SIGHTENGINE_API_SECRET` to your `.env` file
- Restart your backend server after adding the credentials
- Check that there are no typos in the variable names

### API errors

- Check your API credentials are correct
- Verify you haven't exceeded your monthly limit
- Check your internet connection

### Videos still marked as "safe" despite explicit content

- Make sure frames are being extracted (check console logs)
- Verify the API is being called (check for "Analyzing frames..." in logs)
- Check that your API credentials are valid

## Alternative: Google Cloud Vision

If you prefer Google Cloud Vision API instead:
1. See `docs/GOOGLE_CLOUD_VISION_SETUP.md` for setup instructions
2. The system will automatically use Google Cloud Vision if Sightengine is not configured
