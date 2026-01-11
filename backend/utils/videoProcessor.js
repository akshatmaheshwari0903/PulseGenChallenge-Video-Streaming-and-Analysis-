import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize FFmpeg path
let ffmpegInitialized = false;
let ffmpegInitPromise = null;

const initializeFFmpeg = async () => {
  if (ffmpegInitialized) return;
  if (ffmpegInitPromise) return ffmpegInitPromise;
  
  ffmpegInitPromise = (async () => {
    // Try @ffmpeg-installer/ffmpeg and @ffprobe-installer/ffprobe
    try {
      const [ffmpegInstaller, ffprobeInstaller] = await Promise.all([
        import('@ffmpeg-installer/ffmpeg'),
        import('@ffprobe-installer/ffprobe')
      ]);
      
      const ffmpegPath = ffmpegInstaller.path || ffmpegInstaller.default?.path || ffmpegInstaller.default;
      const ffprobePath = ffprobeInstaller.path || ffprobeInstaller.default?.path || ffprobeInstaller.default;
      
      if (ffmpegPath && typeof ffmpegPath === 'string' && fs.existsSync(ffmpegPath)) {
        ffmpeg.setFfmpegPath(ffmpegPath);
        
        if (ffprobePath && typeof ffprobePath === 'string' && fs.existsSync(ffprobePath)) {
          ffmpeg.setFfprobePath(ffprobePath);
          ffmpegInitialized = true;
          console.log('✅ FFmpeg initialized using @ffmpeg-installer packages');
          console.log('   FFmpeg:', ffmpegPath);
          console.log('   FFprobe:', ffprobePath);
          return;
        } else {
          console.warn('⚠️  FFprobe path not found, but continuing with FFmpeg only');
          ffmpegInitialized = true;
          console.log('✅ FFmpeg initialized (metadata extraction may fail):', ffmpegPath);
          return;
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not import @ffmpeg-installer packages:', error.message);
    }

    // Fallback to ffmpeg-static (only has ffmpeg, not ffprobe)
    try {
      const ffmpegStatic = await import('ffmpeg-static');
      const ffmpegPath = ffmpegStatic?.default || ffmpegStatic;
      
      if (ffmpegPath && typeof ffmpegPath === 'string' && fs.existsSync(ffmpegPath)) {
        ffmpeg.setFfmpegPath(ffmpegPath);
        // Try to find ffprobe in the same directory
        const dir = path.dirname(ffmpegPath);
        const ffprobePath = path.join(dir, 'ffprobe.exe');
        if (fs.existsSync(ffprobePath)) {
          ffmpeg.setFfprobePath(ffprobePath);
        } else {
          // Try without .exe extension
          const ffprobePath2 = path.join(dir, 'ffprobe');
          if (fs.existsSync(ffprobePath2)) {
            ffmpeg.setFfprobePath(ffprobePath2);
          } else {
            console.warn('⚠️  ffprobe not found. Metadata extraction may fail.');
          }
        }
        ffmpegInitialized = true;
        console.log('✅ FFmpeg initialized using ffmpeg-static:', ffmpegPath);
        return;
      }
    } catch (error) {
      console.warn('⚠️  Could not import ffmpeg-static:', error.message);
    }

    // Try to find FFmpeg in system PATH
    try {
      const command = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
      const ffmpegPath = execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim().split('\n')[0];
      if (ffmpegPath && fs.existsSync(ffmpegPath)) {
        ffmpeg.setFfmpegPath(ffmpegPath);
        ffmpegInitialized = true;
        console.log('✅ FFmpeg initialized from system PATH:', ffmpegPath);
        return;
      }
    } catch (e) {
      // FFmpeg not in PATH
    }

    // If we get here, FFmpeg was not found
    const errorMsg = 'FFmpeg not found. Please ensure ffmpeg-static is installed or FFmpeg is in your PATH.';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  })();
  
  return ffmpegInitPromise;
};

// Initialize on module load
initializeFFmpeg();

/**
 * Get video metadata (duration, dimensions, etc.)
 * @param {string} videoPath - Path to video file
 * @returns {Promise<object>} Video metadata
 */
export const getVideoMetadata = (videoPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure FFmpeg is initialized - wait for it to complete
      await initializeFFmpeg();
      
      if (!ffmpegInitialized) {
        return reject(new Error('FFmpeg initialization failed. Please check server logs.'));
      }
    } catch (error) {
      return reject(new Error(`FFmpeg initialization error: ${error.message}`));
    }
    
    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return reject(new Error(`Video file not found: ${videoPath}`));
    }

    console.log('Extracting metadata from:', videoPath);

    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error('FFprobe error:', err.message);
        if (err.stderr) {
          console.error('FFprobe stderr:', err.stderr);
        }
        
        // Provide more helpful error messages
        if (err.message.includes('ffprobe') || err.message.includes('not found') || err.message.includes('ENOENT')) {
          return reject(new Error('FFmpeg/FFprobe not found. Please install FFmpeg or ensure ffmpeg-static package is installed.'));
        }
        if (err.message.includes('Invalid data') || err.message.includes('Invalid')) {
          return reject(new Error('Invalid video file format or corrupted file. Please try a different video file.'));
        }
        return reject(new Error(`Failed to extract video metadata: ${err.message}`));
      }

      if (!metadata || !metadata.streams) {
        return reject(new Error('Invalid video metadata: no streams found'));
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

      if (!videoStream) {
        return reject(new Error('No video stream found in file'));
      }

      // Safely calculate FPS
      let fps = 0;
      if (videoStream.r_frame_rate) {
        try {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          fps = den && den > 0 ? num / den : 0;
        } catch (e) {
          fps = 0;
        }
      }

      const metadataResult = {
        duration: metadata.format?.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        bitrate: metadata.format?.bit_rate ? parseInt(metadata.format.bit_rate) : 0,
        codec: videoStream.codec_name || 'unknown',
        fps: fps,
        size: metadata.format?.size ? parseInt(metadata.format.size) : fs.statSync(videoPath).size,
        hasAudio: !!audioStream
      };

      console.log('Metadata extracted successfully:', metadataResult);
      resolve(metadataResult);
    });
  });
};

/**
 * Process video for streaming (compress and optimize)
 * @param {string} inputPath - Input video path
 * @param {string} outputPath - Output video path
 * @param {Function} progressCallback - Progress callback function
 * @returns {Promise<string>} Path to processed video
 */
export const processVideoForStreaming = async (inputPath, outputPath, progressCallback = null) => {
  await initializeFFmpeg();
  
  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-preset medium',
        '-crf 23',
        '-maxrate 2M',
        '-bufsize 4M',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart', // Enable fast start for streaming
        '-f mp4'
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('FFmpeg process started:', commandLine);
      })
      .on('progress', (progress) => {
        if (progressCallback) {
          const percent = progress.percent || 0;
          progressCallback(Math.min(percent, 100));
        }
      })
      .on('end', () => {
        console.log('Video processing completed');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
};

/**
 * Extract frames from video at intervals
 * @param {string} videoPath - Path to video file
 * @param {number} duration - Video duration in seconds
 * @param {number} interval - Interval in seconds between frames
 * @param {number} maxFrames - Maximum number of frames to extract
 * @returns {Promise<string[]>} Array of frame file paths
 */
const extractFrames = async (videoPath, duration, interval = 5, maxFrames = 20) => {
  return new Promise((resolve, reject) => {
    const framesDir = path.join(__dirname, '../uploads/frames');
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }

    const framePaths = [];
    const videoId = path.basename(videoPath, path.extname(videoPath));
    const totalDuration = duration || 60;
    
    // Calculate frame count - ensure at least 1 frame for any video
    let calculatedFrames = Math.floor(totalDuration / interval);
    const frameCount = Math.max(1, Math.min(maxFrames, calculatedFrames));
    
    console.log(`   extractFrames: duration=${totalDuration.toFixed(2)}s, interval=${interval}s, calculated=${calculatedFrames}, final=${frameCount}, maxFrames=${maxFrames}`);
    
    if (frameCount === 0) {
      // Fallback: extract at least 1 frame at the start
      console.warn('Frame count calculated as 0, extracting 1 frame at start');
      const singleFramePath = path.join(framesDir, `${videoId}-frame-0.png`);
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [0],
          filename: `${videoId}-frame-0.png`,
          folder: framesDir,
          size: '320x240'
        })
        .on('end', () => {
          if (fs.existsSync(singleFramePath)) {
            resolve([singleFramePath]);
          } else {
            resolve([]);
          }
        })
        .on('error', (err) => {
          console.error('Single frame extraction error:', err);
          resolve([]);
        });
      return;
    }

    const timestamps = [];

    // Calculate timestamps for frame extraction
    for (let i = 0; i < frameCount; i++) {
      const timestamp = Math.min(i * interval, totalDuration - 1);
      timestamps.push(timestamp);
    }

    // Extract frames
    ffmpeg(videoPath)
      .screenshots({
        timestamps: timestamps,
        filename: `${videoId}-frame-%s.png`,
        folder: framesDir,
        size: '320x240'
      })
      .on('end', () => {
        // Get all extracted frame files
        timestamps.forEach((ts) => {
          const framePath = path.join(framesDir, `${videoId}-frame-${ts}.png`);
          if (fs.existsSync(framePath)) {
            framePaths.push(framePath);
          }
        });
        resolve(framePaths);
      })
      .on('error', (err) => {
        console.error('Frame extraction error:', err);
        reject(err);
      });
  });
};

/**
 * Analyze a single image frame for content
 * Tries multiple services in order: Sightengine (free), Google Cloud Vision, then basic
 * @param {string} framePath - Path to image frame
 * @returns {Promise<object>} Analysis result for the frame
 */
const analyzeFrame = async (framePath) => {
  // Try Sightengine API first (simplest, free tier available)
  if (process.env.SIGHTENGINE_API_USER && process.env.SIGHTENGINE_API_SECRET) {
    try {
      return await analyzeFrameSightengine(framePath);
    } catch (error) {
      console.log('Sightengine analysis failed, trying alternatives:', error.message);
    }
  }

  // Try Google Cloud Vision API
  try {
    const vision = await import('@google-cloud/vision');
    const { ImageAnnotatorClient } = vision;
    const client = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_CLOUD_KEYFILE,
    });

    const [result] = await client.safeSearchDetection(framePath);
    const safeSearch = result.safeSearchAnnotation;

    if (safeSearch) {
      const adultLevel = safeSearch.adult;
      const isExplicit = adultLevel === 'VERY_LIKELY' || adultLevel === 'LIKELY' || adultLevel === 'POSSIBLE';
      
      const violenceLevel = safeSearch.violence;
      const isViolent = violenceLevel === 'VERY_LIKELY' || violenceLevel === 'LIKELY' || violenceLevel === 'POSSIBLE';

      const racyLevel = safeSearch.racy;
      const isRacy = racyLevel === 'VERY_LIKELY' || racyLevel === 'LIKELY';

      return {
        isExplicit: isExplicit || isRacy,
        isViolent: isViolent,
        confidence: isExplicit || isViolent ? 0.9 : 0.5,
        reasons: [],
        details: {
          adult: adultLevel,
          violence: violenceLevel,
          racy: racyLevel
        }
      };
    }
  } catch (error) {
    // Google Cloud Vision not available or failed
  }

  // Fallback to basic analysis (not accurate)
  console.log('No content detection API configured - using basic heuristics (not accurate)');
  return analyzeFrameBasic(framePath);
};

/**
 * Analyze frame using Sightengine API (free tier available)
 * @param {string} framePath - Path to image frame
 * @returns {Promise<object>} Analysis result
 */
const analyzeFrameSightengine = async (framePath) => {
  try {
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('media', fs.createReadStream(framePath));
    formData.append('models', 'nudity,wad,offensive,scam');

    const response = await axios.post(
      'https://api.sightengine.com/1.0/check.json',
      formData,
      {
        params: {
          api_user: process.env.SIGHTENGINE_API_USER,
          api_secret: process.env.SIGHTENGINE_API_SECRET
        },
        headers: formData.getHeaders(),
        // Keep this <= per-frame timeout in analyzeVideoSensitivity to avoid frequent "Frame analysis timeout"
        // and missing live results on the frontend.
        timeout: 4000 // 4 second timeout
      }
    );

    const data = response.data;

    // Sightengine API response format:
    // - nudity: { raw: 0-1, partial: 0-1, safe: 0-1 }
    // - weapon: 0-1
    // - offensive: { prob: 0-1 }
    // - scam: { prob: 0-1 }

    // Check for explicit content (nudity)
    const nudityRaw = data.nudity?.raw || 0;
    const nudityPartial = data.nudity?.partial || 0;
    const nudityScore = Math.max(nudityRaw, nudityPartial);
    const isExplicit = nudityScore > 0.5; // Threshold: 50%

    // Check for offensive content
    const offensiveProb = data.offensive?.prob || 0;
    const isOffensive = offensiveProb > 0.5;

    // Check for weapons/violence
    const weaponProb = data.weapon || 0;
    const isViolent = weaponProb > 0.5;

    // Log detection results for debugging
    if (nudityScore > 0.3 || offensiveProb > 0.3 || weaponProb > 0.3) {
      console.log(`   Frame analysis: nudity=${nudityScore.toFixed(2)}, offensive=${offensiveProb.toFixed(2)}, weapon=${weaponProb.toFixed(2)}`);
    }

    return {
      isExplicit: isExplicit || isOffensive,
      isViolent: isViolent,
      confidence: Math.max(nudityScore, offensiveProb, weaponProb),
      reasons: [],
      details: {
        nudity: nudityScore,
        offensive: offensiveProb,
        weapon: weaponProb
      }
    };

  } catch (error) {
    console.error('Sightengine API error:', error.message);
    throw error;
  }
};

/**
 * Basic frame analysis using simple heuristics (fallback)
 * NOTE: This is NOT accurate for real content detection
 * For accurate detection, use Google Cloud Vision API (see GOOGLE_CLOUD_VISION_SETUP.md)
 * @param {string} framePath - Path to image frame
 * @returns {Promise<object>} Analysis result
 */
const analyzeFrameBasic = async (framePath) => {
  try {
    const stats = fs.statSync(framePath);
    
    // Basic heuristics (NOT accurate - placeholder only)
    // Real content detection requires ML models or APIs
    const analysis = {
      isExplicit: false,
      isViolent: false,
      confidence: 0.2, // Very low confidence - basic analysis is not reliable
      reasons: []
    };

    // Conservative approach: Flag for manual review if file seems unusual
    // This is a placeholder - does NOT actually detect explicit content
    // For real detection, Google Cloud Vision API must be configured
    
    // Note: Without Google Cloud Vision, this will always return safe
    // This is intentional - we don't want false positives from unreliable heuristics
    
    return analysis;
  } catch (error) {
    return {
      isExplicit: false,
      isViolent: false,
      confidence: 0,
      reasons: ['Frame analysis failed']
    };
  }
};

/**
 * Analyze video for content sensitivity using frame sampling
 * @param {string} videoPath - Path to video file
 * @param {object} metadata - Video metadata
 * @returns {Promise<object>} Sensitivity analysis result
 */
export const analyzeVideoSensitivity = async (videoPath, metadata, progressCallback = null) => {
  // progressCallback signature: (progress, status, details)
  console.log('Starting content sensitivity analysis...');
  
  try {
    // Check if any content detection API is available
    const hasSightengine = !!(process.env.SIGHTENGINE_API_USER && process.env.SIGHTENGINE_API_SECRET);
    let hasGoogleVision = false;
    try {
      await import('@google-cloud/vision');
      hasGoogleVision = true;
    } catch (e) {
      // Google Cloud Vision not available
    }

    const useFrameAnalysis = hasSightengine || hasGoogleVision;

    if (!useFrameAnalysis) {
      console.warn('⚠️  WARNING: No content detection API configured!');
      console.warn('   Videos will be marked as safe without actual content analysis.');
      console.warn('   Please configure Sightengine API (free tier) or Google Cloud Vision API.');
      console.warn('   See backend/env.example for setup instructions.');
      
      // Without any API, we can't detect explicit content
      // Flag ALL videos for manual review as a safety measure
      if (progressCallback) progressCallback(100, 'No API configured - flagging for review');
      
      return {
        status: 'flagged',
        confidence: 0.5,
        reasons: ['No content detection API configured - manual review required'],
        timestamp: new Date()
      };
    }

    // For very short videos, still do frame analysis but with fewer frames
    if (!metadata.duration || metadata.duration < 3) {
      console.log('Video too short for frame analysis, using basic check');
      if (progressCallback) progressCallback(100, 'Video too short');
      return {
        status: 'safe',
        confidence: 0.3,
        reasons: ['Video duration too short for analysis'],
        timestamp: new Date()
      };
    }

    // Extract frames from video for analysis
    // For short videos (< 10s), extract frames every 2 seconds
    // For longer videos (>= 10s), extract every 5 seconds
    // Always extract at least 1 frame, even for very short videos
    const frameInterval = metadata.duration < 10 ? 2 : 5;
    let maxFrames = Math.floor(metadata.duration / frameInterval);
    
    // Ensure at least 1 frame for any video, and max 20 frames (increased for better coverage)
    maxFrames = Math.max(1, Math.min(20, maxFrames));
    
    console.log(`Extracting ${maxFrames} frames for analysis (API: ${hasSightengine ? 'Sightengine' : 'Google Cloud Vision'})...`);
    console.log(`   Video duration: ${metadata.duration.toFixed(2)}s, interval: ${frameInterval}s, calculated frames: ${maxFrames}`);
    if (progressCallback) progressCallback(10, 'Extracting frames...', { totalFrames: maxFrames });
    
    // Extract frames with timeout (30 seconds max)
    let frames;
    try {
      frames = await Promise.race([
        extractFrames(videoPath, metadata.duration, frameInterval, maxFrames),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Frame extraction timeout')), 30000) // 30 second timeout
        )
      ]);
    } catch (error) {
      console.warn('Frame extraction failed or timed out:', error.message);
      // Fallback to basic analysis
      return {
        status: 'safe',
        confidence: 0.5,
        reasons: ['Frame extraction failed - manual review recommended'],
        timestamp: new Date()
      };
    }
    
    console.log(`Extracted ${frames.length} frames`);
    
    if (frames.length === 0) {
      console.warn('No frames extracted, using basic heuristics');
      return {
        status: 'safe',
        confidence: 0.5,
        reasons: ['Frame extraction failed - manual review recommended'],
        timestamp: new Date()
      };
    }

    // Analyze each frame
    let explicitCount = 0;
    let violentCount = 0;
    const allReasons = [];

    console.log(`Analyzing ${frames.length} frames...`);
    if (progressCallback) progressCallback(30, 'Analyzing frames...', { totalFrames: frames.length });

    // Analyze frames with timeout per frame (5 seconds max per frame)
    const frameResults = [];
    for (let i = 0; i < frames.length; i++) {
      const framePath = frames[i];
      try {
        // Update progress
        const frameProgress = 30 + ((i + 1) / frames.length) * 20; // 30-50%
        if (progressCallback) {
          progressCallback(frameProgress, `Analyzing frame ${i + 1}/${frames.length}...`, {
            currentFrame: i + 1,
            totalFrames: frames.length,
            frameNumber: i + 1
          });
        }

        // Analyze frame with timeout
        const frameAnalysis = await Promise.race([
          analyzeFrame(framePath),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Frame analysis timeout')), 5000) // 5 second timeout per frame
          )
        ]);
        
        // Store frame analysis result
        const frameResult = {
          frameNumber: i + 1,
          isExplicit: frameAnalysis.isExplicit,
          isViolent: frameAnalysis.isViolent,
          confidence: frameAnalysis.confidence,
          details: frameAnalysis.details || {}
        };
        frameResults.push(frameResult);
        
        if (frameAnalysis.isExplicit) {
          explicitCount++;
          allReasons.push(`Explicit content detected in frame ${i + 1}`);
        }
        if (frameAnalysis.isViolent) {
          violentCount++;
          allReasons.push(`Violent content detected in frame ${i + 1}`);
        }
        
        // Send frame result to progress callback IMMEDIATELY after analysis for live updates
        if (progressCallback) {
          const resultProgress = 30 + ((i + 1) / frames.length) * 20; // 30-50% for analysis
          progressCallback(resultProgress, `Analyzing frame ${i + 1}/${frames.length}...`, {
            currentFrame: i + 1,
            totalFrames: frames.length,
            frameNumber: i + 1,
            frameResult: frameResult, // Send the complete frame result
            liveUpdate: true // Flag for live updates
          });
        }
        
        // Clean up frame file after analysis
        if (fs.existsSync(framePath)) {
          fs.unlinkSync(framePath);
        }
      } catch (error) {
        console.error(`Error analyzing frame ${i + 1}:`, error.message);

        // IMPORTANT: Always emit a frameResult so the frontend can render every frame (even failures),
        // otherwise users will only see the first/last frames that happened to succeed.
        const errorFrameResult = {
          frameNumber: i + 1,
          isExplicit: false,
          isViolent: false,
          confidence: 0,
          details: {},
          error: error.message
        };

        frameResults.push(errorFrameResult);

        if (progressCallback) {
          const resultProgress = 30 + ((i + 1) / frames.length) * 20; // 30-50% for analysis
          progressCallback(resultProgress, `Analyzing frame ${i + 1}/${frames.length}...`, {
            currentFrame: i + 1,
            totalFrames: frames.length,
            frameNumber: i + 1,
            frameResult: errorFrameResult,
            liveUpdate: true
          });
        }

        // Clean up frame file after error as well
        try {
          if (fs.existsSync(framePath)) {
            fs.unlinkSync(framePath);
          }
        } catch (e) {
          // ignore cleanup failures
        }
        // Continue with next frame
      }
    }

    // Determine overall status
    const explicitRatio = explicitCount / frames.length;
    const violentRatio = violentCount / frames.length;
    const threshold = 0.15; // Flag if > 15% of frames are problematic

    const analysis = {
      status: 'safe',
      confidence: 0.85,
      reasons: [],
      timestamp: new Date(),
            frameAnalysis: {
              totalFrames: frames.length,
              explicitFrames: explicitCount,
              violentFrames: violentCount,
              frameResults: frameResults
            }
    };

    // Flag if threshold exceeded (10% of frames)
    if (explicitRatio > threshold || violentRatio > threshold) {
      analysis.status = 'flagged';
      analysis.confidence = Math.max(explicitRatio, violentRatio);
      if (explicitCount > 0) {
        analysis.reasons.push(`Explicit content detected in ${explicitCount} of ${frames.length} frames (${(explicitRatio * 100).toFixed(1)}%)`);
      }
      if (violentCount > 0) {
        analysis.reasons.push(`Violent content detected in ${violentCount} of ${frames.length} frames (${(violentRatio * 100).toFixed(1)}%)`);
      }
    } else if (explicitCount > 0 || violentCount > 0) {
      // Some content detected but below threshold - still flag for review (conservative approach)
      analysis.status = 'flagged';
      analysis.confidence = 0.7;
      if (explicitCount > 0) {
        analysis.reasons.push(`Potential explicit content detected in ${explicitCount} frame(s) - manual review recommended`);
      }
      if (violentCount > 0) {
        analysis.reasons.push(`Potential violent content detected in ${violentCount} frame(s) - manual review recommended`);
      }
    }

    // Additional heuristics
    if (metadata.size > 200 * 1024 * 1024) { // 200MB
      analysis.reasons.push('Large file size - requires manual review');
    }

    if (metadata.duration > 3600) { // 1 hour
      analysis.reasons.push('Long duration - requires manual review');
    }

    console.log('Content analysis complete:', analysis);
    return analysis;

  } catch (error) {
    console.error('Content sensitivity analysis error:', error);
    // On error, flag for manual review to be safe
    return {
      status: 'flagged',
      confidence: 0.5,
      reasons: ['Analysis error - manual review required'],
      timestamp: new Date()
    };
  }
};

/**
 * Generate video thumbnail
 * @param {string} videoPath - Path to video file
 * @param {string} outputPath - Path for thumbnail output
 * @param {number} timeOffset - Time in seconds to capture thumbnail (default: 1)
 * @returns {Promise<string>} Path to thumbnail
 */
export const generateThumbnail = async (videoPath, outputPath, timeOffset = 1) => {
  await initializeFFmpeg();
  
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timeOffset],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '320x240'
      })
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};
