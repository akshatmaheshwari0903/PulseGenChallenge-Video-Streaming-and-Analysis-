import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware to verify JWT token and authenticate user
 */
export const authenticate = async (req, res, next) => {
  try {
    // Try to get token from Authorization header first
    let token = req.headers.authorization?.split(' ')[1];
    
    // If not in header, try query string (for video players that can't send headers)
    if (!token && req.query.token) {
      token = req.query.token;
      // Decode URL-encoded token if needed
      try {
        token = decodeURIComponent(token);
      } catch (e) {
        // Token might not be URL encoded, that's fine
      }
    }

    if (!token) {
      console.log('Auth failed: No token provided', {
        hasAuthHeader: !!req.headers.authorization,
        hasQueryToken: !!req.query.token,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a token.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', {
      error: error.name,
      message: error.message,
      path: req.path,
      hasToken: !!(req.headers.authorization || req.query.token)
    });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

/**
 * Middleware to check user roles
 * @param {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Middleware to ensure user can only access their organization's data
 */
export const checkOrganization = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Admins can access any organization (if needed)
  if (req.user.role === 'admin' && req.query.organization) {
    req.organization = req.query.organization;
  } else {
    req.organization = req.user.organization;
  }

  next();
};
