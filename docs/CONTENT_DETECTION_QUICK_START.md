# Quick Start: Content Sensitivity Detection

## Current Status

The system now extracts frames from videos and analyzes them. However, **for accurate detection, you need to set up Google Cloud Vision API**.

## Two Options

### Option 1: Use Google Cloud Vision API (Recommended - Accurate)

**Setup Time:** ~10 minutes  
**Accuracy:** ✅ High  
**Cost:** Free tier: 1,000 requests/month, then ~$0.03 per video

**Steps:**
1. Follow `GOOGLE_CLOUD_VISION_SETUP.md`
2. Install package: `cd backend && npm install`
3. Add API key to `.env`
4. Done! Videos will be accurately analyzed

### Option 2: Use Without API (Current - Less Accurate)

**Setup Time:** 0 minutes (already works)  
**Accuracy:** ⚠️ Low (basic heuristics only)  
**Cost:** Free

**Current Behavior:**
- Extracts frames from videos
- Uses basic heuristics (not accurate for explicit content)
- Flags videos conservatively based on metadata

**Limitation:** Without Google Cloud Vision, explicit content detection is not reliable.

## How It Works Now

1. **Frame Extraction**: Extracts up to 20 frames (every 5 seconds)
2. **Frame Analysis**: 
   - If Google Cloud Vision is configured → Accurate detection
   - If not configured → Basic heuristics (not reliable)
3. **Flagging**: Flags video if > 10% of frames contain problematic content

## Testing

Upload a video and check backend console:
```
Starting content sensitivity analysis...
Extracting 20 frames for analysis...
Extracted 20 frames
```

If Google Cloud Vision is configured, you'll see frame analysis results.

## Recommendation

For production or accurate detection, **set up Google Cloud Vision API**. It's the simplest solution that actually works correctly.

See `GOOGLE_CLOUD_VISION_SETUP.md` for detailed setup instructions.
