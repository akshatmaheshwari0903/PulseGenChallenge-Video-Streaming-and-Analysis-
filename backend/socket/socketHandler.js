import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Initialize Socket.io connection handling
 * @param {Server} io - Socket.io server instance
 */
export const initializeSocket = (io) => {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      socket.organization = user.organization;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.username} (${socket.user.organization})`);

    // Join organization room for multi-tenant isolation
    socket.join(socket.organization);

    // Join user-specific room
    socket.join(`user:${socket.user._id}`);

    // Handle video processing progress updates
    socket.on('subscribe:video', (videoId) => {
      socket.join(`video:${videoId}`);
      console.log(`User ${socket.user.username} subscribed to video ${videoId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.username}`);
    });
  });

  // Make io instance available for emitting events
  global.io = io;
};

/**
 * Emit video processing progress update
 * @param {string} videoId - Video ID
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} status - Processing status
 * @param {object} details - Additional details (frame info, detection results, etc.)
 */
export const emitVideoProgress = (videoId, progress, status, details = {}) => {
  if (global.io) {
    global.io.to(`video:${videoId}`).emit('video:progress', {
      videoId,
      progress,
      status,
      ...details,
      timestamp: new Date()
    });
  }
};

/**
 * Emit video processing completion
 * @param {string} videoId - Video ID
 * @param {object} result - Processing result
 */
export const emitVideoComplete = (videoId, result) => {
  if (global.io) {
    global.io.to(`video:${videoId}`).emit('video:complete', {
      videoId,
      ...result,
      timestamp: new Date()
    });
  }
};
