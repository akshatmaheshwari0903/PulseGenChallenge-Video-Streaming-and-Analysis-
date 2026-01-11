import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  filename: {
    type: String,
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  processedPath: {
    type: String
  },
  fileSize: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // Duration in seconds
    default: 0
  },
  mimeType: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'completed', 'failed', 'flagged', 'safe'],
    default: 'uploading'
  },
  sensitivityStatus: {
    type: String,
    enum: ['pending', 'safe', 'flagged'],
    default: 'pending'
  },
  sensitivityAnalysis: {
    status: String,
    confidence: Number,
    reasons: [String],
    frameAnalysis: {
      totalFrames: Number,
      explicitFrames: Number,
      violentFrames: Number,
      frameResults: [{
        frameNumber: Number,
        isExplicit: Boolean,
        isViolent: Boolean,
        confidence: Number,
        details: {
          nudity: Number,
          offensive: Number,
          weapon: Number
        }
      }]
    },
    timestamp: Date
  },
  processingProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  organization: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    default: 'uncategorized',
    index: true
  },
  metadata: {
    width: Number,
    height: Number,
    bitrate: Number,
    codec: String,
    fps: Number
  },
  tags: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
videoSchema.index({ uploadedBy: 1, organization: 1 });
videoSchema.index({ status: 1, organization: 1 });
videoSchema.index({ sensitivityStatus: 1, organization: 1 });
videoSchema.index({ category: 1, organization: 1 });
videoSchema.index({ uploadedAt: -1 });

const Video = mongoose.model('Video', videoSchema);

export default Video;
