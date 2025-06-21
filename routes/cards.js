const express = require('express');
const { body, param } = require('express-validator');
const Card = require('../models/Card');
const List = require('../models/List');
const Board = require('../models/Board');
const BoardMember = require('../models/BoardMember');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { logger } = require('../utils/logger');

const router = express.Router();

// Middleware to check card access and permissions
const checkCardAccess = async (req, res, next) => {
  try {
    const cardId = req.params.id || req.params.cardId;
    const card = await Card.findById(cardId)
      .populate('list')
      .populate('board');
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const board = card.board;
    req.card = card;
    req.board = board;

    // Check if user is board owner
    if (board.owner.toString() === req.user._id.toString()) {
      req.userRole = 'owner';
      return next();
    }

    // Check if board is public
    if (board.isPublic) {
      req.userRole = 'viewer';
      return next();
    }

    // Check membership
    const membership = await BoardMember.findOne({
      board: board._id,
      user: req.user._id,
      isActive: true
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    req.userRole = membership.role;
    req.membership = membership;
    next();
  } catch (error) {
    logger.error('Card access check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check card access'
    });
  }
};

/**
 * @swagger
 * /api/cards/list/{listId}:
 *   get:
 *     summary: Get all cards for a list
 *     tags: [Cards]
 *     description: Retrieve all cards for a specific list
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *         description: List ID
 *     responses:
 *       200:
 *         description: Cards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     cards:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Card'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: List not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/list/:listId', [
  param('listId').isMongoId().withMessage('Invalid list ID')
], validate, protect, async (req, res) => {
  try {
    const listId = req.params.listId;
    
    // Check list access
    const list = await List.findById(listId).populate('board');
    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    const board = list.board;

    // Check if user has access to board
    if (board.owner.toString() !== req.user._id.toString() && !board.isPublic) {
      const membership = await BoardMember.findOne({
        board: board._id,
        user: req.user._id,
        isActive: true
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const cards = await Card.find({ list: listId, isArchived: false })
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.author', 'name email avatar')
      .sort({ order: 1 });

    res.json({
      success: true,
      data: {
        cards: cards.map(card => card.getSummary())
      }
    });
  } catch (error) {
    logger.error('Get cards failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cards'
    });
  }
});

/**
 * @swagger
 * /api/cards/{id}:
 *   get:
 *     summary: Get single card
 *     tags: [Cards]
 *     description: Retrieve a specific card by ID with full details
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID
 *     responses:
 *       200:
 *         description: Card retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     card:
 *                       $ref: '#/components/schemas/Card'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Card not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid card ID')
], validate, protect, checkCardAccess, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.author', 'name email avatar')
      .populate('votes.user', 'name email avatar')
      .populate('list', 'title')
      .populate('board', 'title');

    res.json({
      success: true,
      data: {
        card: {
          ...card.toObject(),
          voteCount: card.voteCount,
          completedChecklistItems: card.completedChecklistItems,
          totalChecklistItems: card.totalChecklistItems
        }
      }
    });
  } catch (error) {
    logger.error('Get card failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get card'
    });
  }
});

/**
 * @swagger
 * /api/cards:
 *   post:
 *     summary: Create new card
 *     tags: [Cards]
 *     description: Create a new card in a list (requires create permissions)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - list
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 description: Card title
 *                 example: "Implement user authentication"
 *               list:
 *                 type: string
 *                 description: List ID
 *                 example: "507f1f77bcf86cd799439011"
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Card description
 *                 example: "Implement JWT-based authentication system"
 *               color:
 *                 type: string
 *                 description: Card color
 *                 example: "#0079bf"
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 description: Card priority
 *                 example: "high"
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Due date
 *                 example: "2024-01-15T10:00:00.000Z"
 *               labels:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Label name
 *                       example: "frontend"
 *                     color:
 *                       type: string
 *                       description: Label color
 *                       example: "#ff6b6b"
 *               assignees:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to assign
 *                 example: ["507f1f77bcf86cd799439012"]
 *     responses:
 *       201:
 *         description: Card created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Card created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     card:
 *                       $ref: '#/components/schemas/Card'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied or insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: List not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('list')
    .isMongoId()
    .withMessage('Invalid list ID'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot be more than 2000 characters'),
  body('color')
    .optional()
    .isString()
    .withMessage('Color must be a string'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date')
], validate, protect, async (req, res) => {
  try {
    const { title, list: listId, description, color, priority, dueDate, labels, assignees } = req.body;

    // Check list access
    const list = await List.findById(listId).populate('board');
    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    const board = list.board;

    // Check permissions
    if (board.owner.toString() !== req.user._id.toString()) {
      const membership = await BoardMember.findOne({
        board: board._id,
        user: req.user._id,
        isActive: true
      });

      if (!membership || !membership.permissions.canCreateCards) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create cards on this board'
        });
      }
    }

    // Get the highest order number
    const lastCard = await Card.findOne({ list: listId }).sort({ order: -1 });
    const order = lastCard ? lastCard.order + 1 : 1;

    const card = await Card.create({
      title,
      list: listId,
      board: board._id,
      description,
      color,
      priority,
      dueDate,
      labels: labels || [],
      assignees: assignees || [],
      order,
      createdBy: req.user._id
    });

    await card.populate([
      { path: 'assignees', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' }
    ]);

    logger.info('Card created', { userId: req.user._id, cardId: card._id, listId });

    res.status(201).json({
      success: true,
      message: 'Card created successfully',
      data: {
        card: card.getSummary()
      }
    });
  } catch (error) {
    logger.error('Create card failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create card'
    });
  }
});

// @desc    Update card
// @route   PUT /api/cards/:id
// @access  Private
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid card ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot be more than 2000 characters'),
  body('color')
    .optional()
    .isString()
    .withMessage('Color must be a string'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('isCompleted')
    .optional()
    .isBoolean()
    .withMessage('isCompleted must be a boolean')
], validate, protect, checkCardAccess, async (req, res) => {
  try {
    // Check permissions
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      if (!req.membership?.permissions?.canEditCards) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this card'
        });
      }
    }

    const { title, description, color, priority, dueDate, isCompleted, labels, assignees } = req.body;
    const updateFields = {};

    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (color !== undefined) updateFields.color = color;
    if (priority !== undefined) updateFields.priority = priority;
    if (dueDate !== undefined) updateFields.dueDate = dueDate ? new Date(dueDate) : null;
    if (isCompleted !== undefined) updateFields.isCompleted = isCompleted;
    if (labels !== undefined) updateFields.labels = labels;
    if (assignees !== undefined) updateFields.assignees = assignees;

    const card = await Card.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    )
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar');

    logger.info('Card updated successfully', { cardId: card._id, userId: req.user._id });

    res.json({
      success: true,
      message: 'Card updated successfully',
      data: {
        card: card.getSummary()
      }
    });
  } catch (error) {
    logger.error('Card update failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update card'
    });
  }
});

// @desc    Delete card
// @route   DELETE /api/cards/:id
// @access  Private
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid card ID')
], validate, protect, checkCardAccess, async (req, res) => {
  try {
    // Check permissions
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      if (!req.membership?.permissions?.canDeleteCards) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this card'
        });
      }
    }

    const cardId = req.params.id;
    await Card.findByIdAndDelete(cardId);

    logger.info('Card deleted successfully', { cardId, userId: req.user._id });

    res.json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    logger.error('Card deletion failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete card'
    });
  }
});

// @desc    Move card to different list
// @route   PATCH /api/cards/:id/move
// @access  Private
router.patch('/:id/move', [
  param('id').isMongoId().withMessage('Invalid card ID'),
  body('listId')
    .isMongoId()
    .withMessage('Invalid list ID'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer')
], validate, protect, checkCardAccess, async (req, res) => {
  try {
    // Check permissions
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      if (!req.membership?.permissions?.canMoveCards) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to move this card'
        });
      }
    }

    const { listId, order } = req.body;

    // Check if target list exists and belongs to the same board
    const targetList = await List.findById(listId);
    if (!targetList || targetList.board.toString() !== req.board._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Target list not found or does not belong to the same board'
      });
    }

    const card = await Card.findByIdAndUpdate(
      req.params.id,
      { 
        list: listId,
        order: order !== undefined ? order : 0
      },
      { new: true }
    )
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar');

    logger.info('Card moved successfully', { cardId: card._id, listId, userId: req.user._id });

    res.json({
      success: true,
      message: 'Card moved successfully',
      data: {
        card: card.getSummary()
      }
    });
  } catch (error) {
    logger.error('Card move failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move card'
    });
  }
});

// @desc    Add comment to card
// @route   POST /api/cards/:id/comments
// @access  Private
router.post('/:id/comments', [
  param('id').isMongoId().withMessage('Invalid card ID'),
  body('text')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
], validate, protect, checkCardAccess, async (req, res) => {
  try {
    // Check permissions
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      if (!req.membership?.permissions?.canComment) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to comment on this card'
        });
      }
    }

    const { text } = req.body;

    const card = await Card.findById(req.params.id);
    await card.addComment(req.user._id, text);

    const updatedCard = await Card.findById(req.params.id)
      .populate('comments.author', 'name email avatar');

    const newComment = updatedCard.comments[updatedCard.comments.length - 1];

    logger.info('Comment added to card', { cardId: req.params.id, userId: req.user._id });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        comment: newComment
      }
    });
  } catch (error) {
    logger.error('Add comment failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
});

// @desc    Vote on card
// @route   POST /api/cards/:id/vote
// @access  Private
router.post('/:id/vote', [
  param('id').isMongoId().withMessage('Invalid card ID'),
  body('value')
    .isInt({ min: -1, max: 1 })
    .withMessage('Vote value must be -1, 0, or 1')
], validate, protect, checkCardAccess, async (req, res) => {
  try {
    const { value } = req.body;

    const card = await Card.findById(req.params.id);
    await card.addVote(req.user._id, value);

    logger.info('Vote added to card', { cardId: req.params.id, userId: req.user._id, value });

    res.json({
      success: true,
      message: 'Vote added successfully',
      data: {
        voteCount: card.voteCount
      }
    });
  } catch (error) {
    logger.error('Add vote failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add vote'
    });
  }
});

// @desc    Reorder cards
// @route   PUT /api/cards/reorder
// @access  Private
router.put('/reorder', [
  body('listId')
    .isMongoId()
    .withMessage('Invalid list ID'),
  body('cardOrders')
    .isArray()
    .withMessage('Card orders must be an array'),
  body('cardOrders.*.cardId')
    .isMongoId()
    .withMessage('Invalid card ID'),
  body('cardOrders.*.order')
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer')
], validate, protect, async (req, res) => {
  try {
    const { listId, cardOrders } = req.body;

    // Check list access
    const list = await List.findById(listId).populate('board');
    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    const board = list.board;

    // Check permissions
    if (board.owner.toString() !== req.user._id.toString()) {
      const membership = await BoardMember.findOne({
        board: board._id,
        user: req.user._id,
        isActive: true
      });

      if (!membership || !membership.permissions.canMoveCards) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to reorder cards on this list'
        });
      }
    }

    // Verify all cards belong to the list
    const cardIds = cardOrders.map(item => item.cardId);
    const cards = await Card.find({ _id: { $in: cardIds }, list: listId });
    
    if (cards.length !== cardOrders.length) {
      return res.status(400).json({
        success: false,
        message: 'Some cards do not belong to this list'
      });
    }

    // Reorder cards
    await Card.reorderCards(listId, cardOrders);

    logger.info('Cards reordered successfully', { listId, userId: req.user._id });

    res.json({
      success: true,
      message: 'Cards reordered successfully'
    });
  } catch (error) {
    logger.error('Card reorder failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder cards'
    });
  }
});

module.exports = router; 