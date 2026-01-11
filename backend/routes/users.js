import express from 'express';
import User from '../models/User.js';
import Video from '../models/Video.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin)
 */
router.get('/', authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ organization: req.user.organization })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user._id;
    const organization = req.user.organization;

    const stats = {
      totalVideos: await Video.countDocuments({ 
        organization,
        ...(req.user.role === 'viewer' ? {} : { uploadedBy: userId })
      }),
      completedVideos: await Video.countDocuments({ 
        organization,
        status: 'completed',
        ...(req.user.role === 'viewer' ? {} : { uploadedBy: userId })
      }),
      flaggedVideos: await Video.countDocuments({ 
        organization,
        sensitivityStatus: 'flagged',
        ...(req.user.role === 'viewer' ? {} : { uploadedBy: userId })
      }),
      processingVideos: await Video.countDocuments({ 
        organization,
        status: 'processing',
        ...(req.user.role === 'viewer' ? {} : { uploadedBy: userId })
      }),
      totalSize: await Video.aggregate([
        {
          $match: {
            organization,
            ...(req.user.role === 'viewer' ? {} : { uploadedBy: userId })
          }
        },
        {
          $group: {
            _id: null,
            totalSize: { $sum: '$fileSize' }
          }
        }
      ])
    };

    stats.totalSize = stats.totalSize[0]?.totalSize || 0;

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id/role', 
  authorize('admin'),
  [
    body('role')
      .isIn(['viewer', 'editor', 'admin'])
      .withMessage('Invalid role')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const user = await User.findOne({
        _id: req.params.id,
        organization: req.user.organization
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      user.role = req.body.role;
      await user.save();

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: { user }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update user role',
        error: error.message
      });
    }
  }
);

export default router;
