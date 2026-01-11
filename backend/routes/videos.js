import express from 'express';
import Video from '../models/Video.js';
import Category from '../models/Category.js';
import { authenticate, authorize, checkOrganization } from '../middleware/auth.js';
import { upload, handleUploadError } from '../middleware/upload.js';
import { getVideoMetadata, processVideoForStreaming, analyzeVideoSensitivity } from '../utils/videoProcessor.js';
import { emitVideoProgress, emitVideoComplete } from '../socket/socketHandler.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// All video routes require authentication
router.use(authenticate);
router.use(checkOrganization);

/**
 * @route   POST /api/videos/upload
 * @desc    Upload a video file
 * @access  Private (Editor, Admin)
 */
router.post('/upload', 
  authorize('editor', 'admin'),
  upload.single('video'),
  handleUploadError,
  async (req, res) => {
    try {
      console.log('Upload request received:', {
        hasFile: !!req.file,
        file: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : null,
        body: req.body
      });

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No video file provided'
        });
      }

      const { title, description, category, tags } = req.body;

      // Get video metadata
      let metadata;
      try {
        metadata = await getVideoMetadata(req.file.path);
      } catch (error) {
        console.error('Error getting video metadata:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          filePath: req.file.path,
          fileSize: req.file.size,
          mimetype: req.file.mimetype
        });
        
        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        // Provide more specific error message
        let errorMessage = 'Failed to process video file. ';
        if (error.message.includes('FFmpeg') || error.message.includes('ffprobe')) {
          errorMessage += 'FFmpeg is not installed or not found in PATH. Please install FFmpeg.';
        } else if (error.message.includes('Invalid') || error.message.includes('corrupted')) {
          errorMessage += 'Invalid video format or corrupted file.';
        } else {
          errorMessage += error.message || 'Invalid video format.';
        }
        
        return res.status(400).json({
          success: false,
          message: errorMessage,
          error: error.message
        });
      }

      // Create video record
      const video = await Video.create({
        title: title || req.file.originalname,
        filename: req.file.filename,
        originalFilename: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        duration: metadata.duration,
        mimeType: req.file.mimetype,
        uploadedBy: req.user._id,
        organization: req.organization,
        category: category || 'uncategorized',
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        description: description || '',
        metadata: {
          width: metadata.width,
          height: metadata.height,
          bitrate: metadata.bitrate,
          codec: metadata.codec,
          fps: metadata.fps
        },
        status: 'processing'
      });

      // Start processing in background
      processVideoAsync(video._id.toString(), req.file.path, metadata);

      res.status(201).json({
        success: true,
        message: 'Video uploaded successfully. Processing started.',
        data: { video }
      });
    } catch (error) {
      console.error('Upload error:', error);
      
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Video upload failed',
        error: error.message
      });
    }
  }
);

/**
 * Background video processing function
 */
async function processVideoAsync(videoId, inputPath, metadata) {
  const startTime = Date.now();
  console.log(`\n🚀 Starting video processing for ${videoId}`);
  console.log(`   File: ${inputPath}`);
  console.log(`   Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Duration: ${metadata.duration?.toFixed(2)}s`);
  
  try {
    emitVideoProgress(videoId, 10, 'processing');
    console.log(`   [10%] Processing started`);

    // Update video status
    await Video.findByIdAndUpdate(videoId, {
      status: 'processing',
      processingProgress: 10
    });

    // Analyze sensitivity
    emitVideoProgress(videoId, 30, 'analyzing');
    await Video.findByIdAndUpdate(videoId, { processingProgress: 30, status: 'analyzing' });
    console.log(`   [30%] Starting content analysis...`);

    // Pass progress callback to sensitivity analysis
    const sensitivityAnalysis = await analyzeVideoSensitivity(inputPath, metadata, (progress, status, details = {}) => {
      const totalProgress = 30 + (progress * 0.2); // 30-50% for analysis
      const statusMessage = status || 'analyzing';
      emitVideoProgress(videoId, totalProgress, statusMessage, {
        analysisDetails: details,
        currentFrame: details.currentFrame,
        totalFrames: details.totalFrames,
        frameResult: details.frameResult
      });
      Video.findByIdAndUpdate(videoId, { processingProgress: totalProgress, status: 'analyzing' }).catch(console.error);
      console.log(`   [${totalProgress.toFixed(0)}%] ${statusMessage}${details.currentFrame ? ` (Frame ${details.currentFrame}/${details.totalFrames})` : ''}`);
    });
    
    console.log(`   [50%] Content analysis complete:`, sensitivityAnalysis.status);
    
    emitVideoProgress(videoId, 50, 'compressing');
    await Video.findByIdAndUpdate(videoId, { processingProgress: 50 });
    console.log(`   [50%] Starting video compression...`);

    // Process video for streaming
    const processedDir = path.join(__dirname, '../uploads/processed');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    const outputPath = path.join(processedDir, `processed-${videoId}.mp4`);
    
    await processVideoForStreaming(inputPath, outputPath, (progress) => {
      const totalProgress = 50 + (progress * 0.4); // 50-90% for compression
      emitVideoProgress(videoId, totalProgress, 'compressing');
      if (progress % 20 === 0) {
        console.log(`   [${totalProgress.toFixed(0)}%] Compressing...`);
      }
    }, { hasAudio: metadata?.hasAudio !== false, duration: metadata?.duration });

    console.log(`   [90%] Compression complete`);
    emitVideoProgress(videoId, 95, 'finalizing');
    await Video.findByIdAndUpdate(videoId, { processingProgress: 95 });

    // Update video with final status
    const finalStatus = sensitivityAnalysis.status === 'flagged' ? 'flagged' : 'completed';
    await Video.findByIdAndUpdate(videoId, {
      status: finalStatus,
      sensitivityStatus: sensitivityAnalysis.status,
      sensitivityAnalysis: sensitivityAnalysis, // Store full analysis results
      processedPath: outputPath,
      processingProgress: 100,
      processedAt: new Date()
    });

    emitVideoComplete(videoId, {
      status: finalStatus,
      sensitivityStatus: sensitivityAnalysis.status,
      progress: 100
    });

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Video ${videoId} processing completed in ${processingTime}s`);
    console.log(`   Final status: ${finalStatus}`);
    console.log(`   Sensitivity: ${sensitivityAnalysis.status}\n`);
  } catch (error) {
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ Video ${videoId} processing failed after ${processingTime}s:`, error);
    console.error(`   Error details:`, error.message);
    console.error(`   Stack:`, error.stack);
    
    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      processingProgress: 0
    }).catch(err => console.error('Failed to update video status:', err));

    emitVideoComplete(videoId, {
      status: 'failed',
      error: error.message
    });
  }
}

/**
 * @route   GET /api/videos
 * @desc    Get all videos for user's organization
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sensitivityStatus,
      category,
      sortBy = 'uploadedAt',
      sortOrder = 'desc',
      search,
      minSize,
      maxSize,
      minDuration,
      maxDuration,
      startDate,
      endDate
    } = req.query;

    const query = { organization: req.organization };

    // Role-based filtering
    if (req.user.role === 'viewer') {
      // Viewers can only see completed/flagged videos
      query.status = { $in: ['completed', 'flagged', 'safe'] };
    }

    // Apply filters
    if (status) query.status = status;
    if (sensitivityStatus) query.sensitivityStatus = sensitivityStatus;
    if (category) query.category = category;
    if (minSize) query.fileSize = { ...query.fileSize, $gte: parseInt(minSize) };
    if (maxSize) query.fileSize = { ...query.fileSize, $lte: parseInt(maxSize) };
    if (minDuration) query.duration = { ...query.duration, $gte: parseFloat(minDuration) };
    if (maxDuration) query.duration = { ...query.duration, $lte: parseFloat(maxDuration) };
    if (startDate || endDate) {
      query.uploadedAt = {};
      if (startDate) query.uploadedAt.$gte = new Date(startDate);
      if (endDate) query.uploadedAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const videos = await Video.find(query)
      .populate('uploadedBy', 'username email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch videos',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/videos/:id/stream
 * @desc    Stream video with range request support
 * @access  Private (supports token in query string for video players)
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.get('/:id/stream', authenticate, checkOrganization, async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      organization: req.organization
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Use processed video if available, otherwise use original
    const videoPath = video.processedPath || video.filePath;

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        success: false,
        message: 'Video file not found'
      });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Send entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stream video',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/videos/:id
 * @desc    Get single video by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      organization: req.organization
    }).populate('uploadedBy', 'username email');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.json({
      success: true,
      data: { video }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/videos/:id
 * @desc    Update video metadata
 * @access  Private (Editor, Admin)
 */
router.put('/:id', authorize('editor', 'admin'), async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;

    const video = await Video.findOne({
      _id: req.params.id,
      organization: req.organization
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if user owns the video or is admin
    if (req.user.role !== 'admin' && video.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this video'
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category) updateData.category = category;
    if (tags) updateData.tags = tags.split(',').map(t => t.trim());

    const updatedVideo = await Video.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('uploadedBy', 'username email');

    res.json({
      success: true,
      message: 'Video updated successfully',
      data: { video: updatedVideo }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update video',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/videos/:id
 * @desc    Delete video
 * @access  Private (Editor, Admin)
 */
router.delete('/:id', authorize('editor', 'admin'), async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      organization: req.organization
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if user owns the video or is admin
    if (req.user.role !== 'admin' && video.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this video'
      });
    }

    // Delete files
    if (fs.existsSync(video.filePath)) {
      fs.unlinkSync(video.filePath);
    }
    if (video.processedPath && fs.existsSync(video.processedPath)) {
      fs.unlinkSync(video.processedPath);
    }

    await Video.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete video',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/videos/categories/list
 * @desc    Get all categories for organization
 * @access  Private
 */
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Category.find({ organization: req.organization });
    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

export default router;
