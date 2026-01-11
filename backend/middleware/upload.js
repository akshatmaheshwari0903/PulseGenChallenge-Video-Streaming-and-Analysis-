import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../uploads/videos');
const processedDir = path.join(__dirname, '../uploads/processed');

[uploadDir, processedDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter for video files
const fileFilter = (req, file, cb) => {
  console.log('File filter check:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    encoding: file.encoding
  });

  const allowedMimes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/x-matroska'
  ];

  // Also check file extension as fallback
  const allowedExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.mpeg'];
  const fileExt = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
    console.log('File accepted');
    cb(null, true);
  } else {
    console.log('File rejected - mimetype:', file.mimetype, 'extension:', fileExt);
    cb(new Error(`Invalid file type. Only video files are allowed. Received: ${file.mimetype || 'unknown'}`), false);
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 500 * 1024 * 1024 // 500MB default
  }
});

// Error handler for multer
export const handleUploadError = (err, req, res, next) => {
  console.error('Upload error details:', {
    error: err.message,
    code: err.code,
    field: err.field,
    name: err.name,
    file: req.file
  });

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 500MB.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Please use "video" as the field name.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
      code: err.code
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Upload failed',
      error: err.message
    });
  }
  
  next();
};
