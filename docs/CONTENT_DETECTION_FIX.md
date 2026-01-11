# Content Detection Fix - Nudity Detection

## Problem

Videos containing nudity were being uploaded and marked as "safe" because:
- No content detection API was configured
- The system was using basic heuristics (not accurate)
- Frames were not being extracted and analyzed

## Solution

I've implemented **Sightengine API** integration (free tier available) for accurate content detection. The system now:

1. **Extracts frames** from videos (every 10 seconds, max 10 frames)
2. **Analyzes each frame** using Sightengine API for:
   - Nudity detection
   - Violence/weapons detection
   - Offensive content detection
3. **Flags videos** if explicit content is detected

## What Changed

### 1. Added Sightengine API Support
- Added `form-data` and `axios` packages
- Implemented `analyzeFrameSightengine()` function
- Updated `analyzeVideoSensitivity()` to check for API availability

### 2. Improved Safety
- If **no API is configured**, videos are now **flagged for manual review** (safety measure)
- Clear warnings in console when no API is configured
- Better error handling and logging

### 3. Updated Configuration
- Added `SIGHTENGINE_API_USER` and `SIGHTENGINE_API_SECRET` to `backend/env.example`
- Created setup guide: `docs/SIGHTENGINE_SETUP.md`

## Next Steps - REQUIRED

### To Enable Content Detection:

1. **Sign up for Sightengine** (free tier):
   - Go to https://sightengine.com/
   - Create a free account
   - Get your API credentials from the dashboard

2. **Add credentials to `.env`**:
   ```env
   SIGHTENGINE_API_USER=your_api_user_here
   SIGHTENGINE_API_SECRET=your_api_secret_here
   ```

3. **Restart your backend server**

4. **Test with a video upload**

## How It Works Now

### With Sightengine API Configured:
1. Video is uploaded
2. System extracts 10 frames (every 10 seconds)
3. Each frame is sent to Sightengine API
4. API analyzes for nudity, violence, offensive content
5. If >10% of frames contain explicit content → video is **flagged**
6. Flagged videos are marked as `flagged` status (not `completed`)

### Without API (Current State):
- Videos are **automatically flagged** for manual review
- Console shows warning: "⚠️ WARNING: No content detection API configured!"
- This is a safety measure to prevent explicit content from being marked as safe

## Free Tier Limits

- **1,000 requests/month** (free)
- Each video uses ~10 requests (one per frame)
- ~100 videos/month can be analyzed for free

## Testing

After setting up Sightengine API:

1. Upload a test video
2. Check backend console logs:
   ```
   Extracting X frames for analysis (API: Sightengine)...
   Analyzing frames...
   ```
3. If explicit content is detected:
   ```
   Frame analysis: nudity=0.85, offensive=0.12, weapon=0.00
   Content analysis complete: flagged
   ```

## Troubleshooting

### "No content detection API configured" warning
- Add `SIGHTENGINE_API_USER` and `SIGHTENGINE_API_SECRET` to `.env`
- Restart backend server

### Videos still marked as "safe"
- Check that frames are being extracted (look for "Extracting X frames" in logs)
- Verify API credentials are correct
- Check Sightengine dashboard for API usage/errors

### API errors
- Verify credentials are correct
- Check you haven't exceeded free tier limit (1,000/month)
- Check internet connection

## Alternative: Google Cloud Vision

If you prefer Google Cloud Vision:
1. See `docs/GOOGLE_CLOUD_VISION_SETUP.md`
2. System will automatically use it if Sightengine is not configured
