# Google Cloud Vision API Setup Guide

## Why Google Cloud Vision API?

This is the **simplest and most accurate** solution for content sensitivity detection. It provides:
- ✅ Accurate explicit content detection
- ✅ Violence detection
- ✅ Easy integration
- ✅ Reliable results
- ✅ Free tier available (first 1,000 requests/month free)

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Note your project ID

### 2. Enable Vision API

1. Go to **APIs & Services** > **Library**
2. Search for "Cloud Vision API"
3. Click **Enable**

### 3. Create Service Account

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name it (e.g., "pulsegen-vision")
4. Grant role: **Cloud Vision API User**
5. Click **Create Key** > **JSON**
6. Download the JSON key file
7. Save it securely (e.g., `backend/google-cloud-key.json`)

### 4. Add to .env

Add to your `backend/.env` file:

```env
# Google Cloud Vision API (Optional - for content detection)
GOOGLE_CLOUD_KEYFILE=./google-cloud-key.json
# OR use environment variable:
# GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json
```

### 5. Install Package

The package is already in `package.json`. Just install:

```bash
cd backend
npm install
```

### 6. Test

Upload a video and check the backend console for:
- "Extracting X frames for analysis..."
- "Extracted X frames"
- Frame analysis results

## How It Works

1. **Frame Extraction**: Extracts frames from video every 5 seconds
2. **Image Analysis**: Each frame is analyzed by Google Cloud Vision API
3. **Content Detection**: Detects:
   - Adult/explicit content
   - Violent content
   - Racy content
4. **Flagging**: Video is flagged if > 10% of frames contain problematic content

## Cost

- **Free Tier**: First 1,000 requests/month free
- **After Free Tier**: ~$1.50 per 1,000 images
- **Per Video**: ~20 frames = ~$0.03 per video (after free tier)

## Without Google Cloud Vision

If you don't set up Google Cloud Vision API, the system will:
- Still extract frames
- Use basic heuristics (less accurate)
- Flag videos conservatively

The code automatically falls back to basic analysis if Google Cloud Vision is not available.

## Alternative: Use Free Service

If you prefer a free alternative, you can use:
- **Sightengine API** (free tier available)
- **AWS Rekognition** (free tier available)
- **Self-hosted ML models** (free but complex)

See `CONTENT_DETECTION_EXPLANATION.md` for alternatives.

---

**Note**: The current implementation will work without Google Cloud Vision, but with reduced accuracy. For production use, Google Cloud Vision API is recommended.
