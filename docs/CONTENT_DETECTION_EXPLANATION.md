# Content Sensitivity Detection - Current Implementation

## ⚠️ Important: Demo/Stub Implementation

The current content sensitivity analysis is a **simplified demo version** that does **NOT** actually analyze video content. It uses basic heuristics and random flagging, which means sensitive content can pass through undetected.

## Current Implementation (Demo)

**Location:** `backend/utils/videoProcessor.js` - `analyzeVideoSensitivity()` function

**What it currently does:**
```javascript
export const analyzeVideoSensitivity = async (videoPath, metadata) => {
  // Simulates processing time (2 seconds)
  await new Promise(resolve => setTimeout(resolve, 2000));

  const analysis = {
    status: 'safe', // Defaults to safe
    confidence: 0.85,
    reasons: [],
    timestamp: new Date()
  };

  // Only checks:
  // 1. File size (> 100MB = flag for review)
  // 2. Duration (> 1 hour = flag for review)
  // 3. Random 10% chance of flagging (for demo)
  
  // ❌ NO actual video content analysis
  // ❌ NO image/video frame analysis
  // ❌ NO ML model integration
  // ❌ NO external content moderation API
};
```

**Why sensitive content passes:**
- No actual video frame analysis
- No ML model to detect inappropriate content
- Only random 10% flagging chance
- Only checks metadata (size, duration), not content

## What's Needed for Real Content Detection

### Option 1: ML Model Integration (Recommended for Production)

**Use pre-trained models:**
- **Google Cloud Video Intelligence API**
- **AWS Rekognition Video**
- **Azure Video Analyzer**
- **Open-source models** (TensorFlow, PyTorch)

**Example Implementation:**
```javascript
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';

export const analyzeVideoSensitivity = async (videoPath, metadata) => {
  const client = new VideoIntelligenceServiceClient();
  
  const request = {
    inputUri: videoPath, // or upload to cloud storage first
    features: ['EXPLICIT_CONTENT_DETECTION', 'OBJECT_TRACKING'],
  };

  const [operation] = await client.annotateVideo(request);
  const [results] = await operation.promise();
  
  // Check for explicit content
  const explicitContent = results.annotationResults[0]?.explicitAnnotation;
  
  if (explicitContent) {
    const pornLikelihood = explicitContent.frames
      .map(f => f.pornographyLikelihood)
      .find(l => l === 'VERY_LIKELY' || l === 'LIKELY');
    
    if (pornLikelihood) {
      return {
        status: 'flagged',
        confidence: 0.9,
        reasons: ['Explicit content detected'],
        timestamp: new Date()
      };
    }
  }
  
  return {
    status: 'safe',
    confidence: 0.85,
    reasons: [],
    timestamp: new Date()
  };
};
```

### Option 2: Frame Sampling + Image Analysis

**Extract frames and analyze:**
```javascript
import ffmpeg from 'fluent-ffmpeg';
import { analyzeImage } from './imageAnalysis'; // Your image analysis service

export const analyzeVideoSensitivity = async (videoPath, metadata) => {
  // Extract frames at intervals
  const frames = await extractFrames(videoPath, {
    interval: 5, // Every 5 seconds
    count: Math.min(20, Math.floor(metadata.duration / 5)) // Max 20 frames
  });
  
  // Analyze each frame
  let flaggedCount = 0;
  for (const frame of frames) {
    const analysis = await analyzeImage(frame);
    if (analysis.isExplicit || analysis.isViolent) {
      flaggedCount++;
    }
  }
  
  // Flag if > 10% of frames are problematic
  if (flaggedCount / frames.length > 0.1) {
    return {
      status: 'flagged',
      confidence: flaggedCount / frames.length,
      reasons: [`${flaggedCount} frames flagged for explicit content`],
      timestamp: new Date()
    };
  }
  
  return {
    status: 'safe',
    confidence: 1 - (flaggedCount / frames.length),
    reasons: [],
    timestamp: new Date()
  };
};
```

### Option 3: External Content Moderation API

**Use services like:**
- **Sightengine** - Image and video moderation
- **AWS Rekognition** - Content moderation
- **Google Cloud Video Intelligence**
- **Microsoft Azure Content Moderator**

**Example with Sightengine:**
```javascript
import axios from 'axios';

export const analyzeVideoSensitivity = async (videoPath, metadata) => {
  // Upload video to temporary storage or send frames
  const formData = new FormData();
  formData.append('video', fs.createReadStream(videoPath));
  formData.append('models', 'nudity,offensive,scam');
  
  const response = await axios.post(
    'https://api.sightengine.com/1.0/video/check.json',
    formData,
    {
      params: {
        api_user: process.env.SIGHTENGINE_API_USER,
        api_secret: process.env.SIGHTENGINE_API_SECRET
      }
    }
  );
  
  if (response.data.nudity?.raw > 0.7 || response.data.offensive?.prob > 0.7) {
    return {
      status: 'flagged',
      confidence: Math.max(response.data.nudity?.raw || 0, response.data.offensive?.prob || 0),
      reasons: ['Explicit or offensive content detected'],
      timestamp: new Date()
    };
  }
  
  return {
    status: 'safe',
    confidence: 1 - Math.max(response.data.nudity?.raw || 0, response.data.offensive?.prob || 0),
    reasons: [],
    timestamp: new Date()
  };
};
```

### Option 4: Open-Source ML Models

**Use TensorFlow.js or similar:**
```javascript
import * as tf from '@tensorflow/tfjs-node';
import { loadModel } from './nsfwModel'; // NSFW detection model

export const analyzeVideoSensitivity = async (videoPath, metadata) => {
  const model = await loadModel();
  const frames = await extractFrames(videoPath, { interval: 2 });
  
  let explicitCount = 0;
  for (const frame of frames) {
    const prediction = await model.predict(frame);
    if (prediction.porn > 0.5 || prediction.hentai > 0.5) {
      explicitCount++;
    }
  }
  
  if (explicitCount / frames.length > 0.15) {
    return {
      status: 'flagged',
      confidence: explicitCount / frames.length,
      reasons: ['Explicit content detected in multiple frames'],
      timestamp: new Date()
    };
  }
  
  return {
    status: 'safe',
    confidence: 1 - (explicitCount / frames.length),
    reasons: [],
    timestamp: new Date()
  };
};
```

## Implementation Recommendations

### For Production:

1. **Use Cloud APIs** (Easiest):
   - Google Cloud Video Intelligence API
   - AWS Rekognition
   - Azure Video Analyzer

2. **Frame Sampling + Analysis** (More control):
   - Extract frames every N seconds
   - Analyze frames with image moderation API
   - Flag if threshold exceeded

3. **Hybrid Approach** (Best):
   - Quick metadata check (current)
   - Frame sampling for suspicious videos
   - Cloud API for final verification

### Cost Considerations:

- **Cloud APIs**: Pay per video/minute analyzed
- **Self-hosted ML**: Higher upfront cost, lower per-video cost
- **Hybrid**: Use cloud API only for flagged videos

## Current Limitations

✅ **What works:**
- File size validation
- Duration checks
- Basic metadata extraction

❌ **What doesn't work:**
- Actual content analysis
- Explicit content detection
- Violence detection
- Inappropriate material detection

## Security Recommendations

Until real content detection is implemented:

1. **Manual Review Queue:**
   - Flag all videos for manual review
   - Admin approval required before publishing

2. **User Reporting:**
   - Allow users to report inappropriate content
   - Quick removal mechanism

3. **Access Control:**
   - Restrict who can upload
   - Monitor upload patterns

4. **Terms of Service:**
   - Clear policy on prohibited content
   - Consequences for violations

## Next Steps

To implement real content detection:

1. **Choose a solution:**
   - Cloud API (easiest, paid)
   - Self-hosted ML model (more complex, free)
   - Hybrid approach (balanced)

2. **Update `analyzeVideoSensitivity()` function:**
   - Replace demo logic with real analysis
   - Add proper error handling
   - Implement confidence scoring

3. **Add configuration:**
   - API keys in `.env`
   - Sensitivity thresholds
   - Processing options

4. **Testing:**
   - Test with known safe content
   - Test with known explicit content
   - Verify flagging accuracy

---

**Note:** The current implementation is intentionally simplified for demonstration purposes. For production use, real content moderation must be implemented.
