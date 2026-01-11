import express from 'express';
import Category from '../models/Category.js';
import { authenticate, authorize, checkOrganization } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

router.use(authenticate);
router.use(checkOrganization);

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private (Editor, Admin)
 */
router.post('/', 
  authorize('editor', 'admin'),
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Category name must be between 1 and 50 characters'),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Description cannot exceed 200 characters'),
    body('color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i)
      .withMessage('Color must be a valid hex color')
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

      const { name, description, color } = req.body;

      const category = await Category.create({
        name,
        description,
        color: color || '#3B82F6',
        createdBy: req.user._id,
        organization: req.organization
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: { category }
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists in your organization'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to create category',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/categories
 * @desc    Get all categories for organization
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ organization: req.organization })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

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

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a category
 * @access  Private (Editor, Admin)
 */
router.delete('/:id', authorize('editor', 'admin'), async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      organization: req.organization
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
});

export default router;
