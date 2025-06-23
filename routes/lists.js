const express = require('express');
const { body, param } = require('express-validator');
const List = require('../models/List');
const Board = require('../models/Board');
const BoardMember = require('../models/BoardMember');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { logger } = require('../utils/logger');

const router = express.Router();

// Middleware to check list access and permissions
const checkListAccess = async (req, res, next) => {
  try {
    const listId = req.params.id || req.params.listId;
    const list = await List.findById(listId).populate('board');
    
    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    const board = list.board;
    req.list = list;
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
    logger.error('List access check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check list access'
    });
  }
};

/**
 * @swagger
 * /api/lists/board/{boardId}:
 *   get:
 *     summary: Get all lists for a board
 *     tags: [Lists]
 *     description: Retrieve all lists for a specific board
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     responses:
 *       200:
 *         description: Lists retrieved successfully
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
 *                     lists:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/List'
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
 *         description: Board not found
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
router.get('/board/:boardId', [
  param('boardId').isMongoId().withMessage('Invalid board ID')
], validate, protect, async (req, res) => {
  try {
    const boardId = req.params.boardId;
    
    // Check board access
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check if user has access to board
    if (board.owner.toString() !== req.user._id.toString() && !board.isPublic) {
      const membership = await BoardMember.findOne({
        board: boardId,
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

    const lists = await List.find({ board: boardId, isArchived: false })
      .populate({
        path: 'cards',
        select: 'title description order color labels assignees dueDate isCompleted priority',
        populate: {
          path: 'assignees',
          select: 'name email avatar'
        }
      })
      .populate('createdBy', 'name email avatar')
      .sort({ order: 1 });

    res.json({
      success: true,
      data: {
        lists: lists.map(list => ({
          ...list.getSummary(),
          cards: list.cards
        }))
      }
    });
  } catch (error) {
    logger.error('Get lists failed: ' + (error && (error.stack || error.message || JSON.stringify(error))));
    res.status(500).json({
      success: false,
      message: 'Failed to get lists'
    });
  }
});

/**
 * @swagger
 * /api/lists/{id}:
 *   get:
 *     summary: Get single list
 *     tags: [Lists]
 *     description: Retrieve a specific list by ID with its cards
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: List ID
 *     responses:
 *       200:
 *         description: List retrieved successfully
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
 *                     list:
 *                       $ref: '#/components/schemas/List'
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
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid list ID')
], validate, protect, checkListAccess, async (req, res) => {
  try {
    const list = await List.findById(req.params.id)
      .populate({
        path: 'cards',
        select: 'title description order color labels assignees dueDate isCompleted priority',
        populate: {
          path: 'assignees',
          select: 'name email avatar'
        }
      })
      .populate('createdBy', 'name email avatar')
      .populate('board', 'title description');

    res.json({
      success: true,
      data: {
        list: {
          ...list.getSummary(),
          cards: list.cards
        }
      }
    });
  } catch (error) {
    logger.error('Get list failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get list'
    });
  }
});

/**
 * @swagger
 * /api/lists:
 *   post:
 *     summary: Create new list
 *     tags: [Lists]
 *     description: Create a new list on a board (requires create permissions)
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
 *               - board
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: List title
 *                 example: "To Do"
 *               board:
 *                 type: string
 *                 description: Board ID
 *                 example: "507f1f77bcf86cd799439011"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: List description
 *                 example: "Tasks that need to be done"
 *               color:
 *                 type: string
 *                 description: List color
 *                 example: "#0079bf"
 *     responses:
 *       201:
 *         description: List created successfully
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
 *                   example: "List created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     list:
 *                       $ref: '#/components/schemas/List'
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
 *         description: Board not found
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
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('board')
    .isMongoId()
    .withMessage('Invalid board ID'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  body('color')
    .optional()
    .isString()
    .withMessage('Color must be a string')
], validate, protect, async (req, res) => {
  try {
    const { title, board: boardId, description, color } = req.body;

    // Check board access
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check permissions
    if (board.owner.toString() !== req.user._id.toString()) {
      const membership = await BoardMember.findOne({
        board: boardId,
        user: req.user._id,
        isActive: true
      });

      if (!membership || !membership.permissions.canCreateLists) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create lists on this board'
        });
      }
    }

    // Get the highest order number
    const lastList = await List.findOne({ board: boardId }).sort({ order: -1 });
    const order = lastList ? lastList.order + 1 : 1;

    const list = await List.create({
      title,
      board: boardId,
      description,
      color,
      order,
      createdBy: req.user._id
    });

    await list.populate('createdBy', 'name email avatar');

    logger.info('List created', { userId: req.user._id, listId: list._id, boardId });

    res.status(201).json({
      success: true,
      message: 'List created successfully',
      data: {
        list: list.getSummary()
      }
    });
  } catch (error) {
    logger.error('Create list failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create list'
    });
  }
});

/**
 * @swagger
 * /api/lists/{id}:
 *   put:
 *     summary: Update list
 *     tags: [Lists]
 *     description: Update list details (requires edit permissions)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: List ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: List title
 *                 example: "Updated To Do"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: List description
 *                 example: "Updated task list"
 *               color:
 *                 type: string
 *                 description: List color
 *                 example: "#ff6b6b"
 *     responses:
 *       200:
 *         description: List updated successfully
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
 *                   example: "List updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     list:
 *                       $ref: '#/components/schemas/List'
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
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid list ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  body('color')
    .optional()
    .isString()
    .withMessage('Color must be a string')
], validate, protect, checkListAccess, async (req, res) => {
  try {
    const { title, description, color } = req.body;

    // Check edit permissions
    if (req.userRole !== 'owner' && req.membership && !req.membership.permissions.canEditLists) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this list'
      });
    }

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (color !== undefined) updateFields.color = color;

    const list = await List.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email avatar');

    logger.info('List updated', { userId: req.user._id, listId: list._id });

    res.json({
      success: true,
      message: 'List updated successfully',
      data: {
        list: list.getSummary()
      }
    });
  } catch (error) {
    logger.error('Update list failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update list'
    });
  }
});

/**
 * @swagger
 * /api/lists/{id}:
 *   delete:
 *     summary: Delete list
 *     tags: [Lists]
 *     description: Delete a list (requires delete permissions)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: List ID
 *     responses:
 *       200:
 *         description: List deleted successfully
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
 *                   example: "List deleted successfully"
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
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid list ID')
], validate, protect, checkListAccess, async (req, res) => {
  try {
    // Check delete permissions
    if (req.userRole !== 'owner' && req.membership && !req.membership.permissions.canDeleteLists) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this list'
      });
    }

    await List.findByIdAndDelete(req.params.id);

    logger.info('List deleted', { userId: req.user._id, listId: req.params.id });

    res.json({
      success: true,
      message: 'List deleted successfully'
    });
  } catch (error) {
    logger.error('Delete list failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete list'
    });
  }
});

/**
 * @swagger
 * /api/lists/{id}/reorder:
 *   put:
 *     summary: Reorder list
 *     tags: [Lists]
 *     description: Change the order of a list within its board
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: List ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newOrder
 *             properties:
 *               newOrder:
 *                 type: integer
 *                 minimum: 1
 *                 description: New position for the list
 *                 example: 3
 *     responses:
 *       200:
 *         description: List reordered successfully
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
 *                   example: "List reordered successfully"
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
router.put('/:id/reorder', [
  param('id').isMongoId().withMessage('Invalid list ID'),
  body('newOrder')
    .isInt({ min: 1 })
    .withMessage('New order must be a positive integer')
], validate, protect, checkListAccess, async (req, res) => {
  try {
    const { newOrder } = req.body;

    // Check edit permissions
    if (req.userRole !== 'owner' && req.membership && !req.membership.permissions.canEditLists) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reorder this list'
      });
    }

    const list = await List.findById(req.params.id);
    const currentOrder = list.order;

    if (currentOrder === newOrder) {
      return res.json({
        success: true,
        message: 'List order unchanged'
      });
    }

    // Update orders of other lists
    if (currentOrder < newOrder) {
      await List.updateMany(
        { board: list.board, order: { $gt: currentOrder, $lte: newOrder } },
        { $inc: { order: -1 } }
      );
    } else {
      await List.updateMany(
        { board: list.board, order: { $gte: newOrder, $lt: currentOrder } },
        { $inc: { order: 1 } }
      );
    }

    // Update the target list
    list.order = newOrder;
    await list.save();

    logger.info('List reordered', { userId: req.user._id, listId: list._id, newOrder });

    res.json({
      success: true,
      message: 'List reordered successfully'
    });
  } catch (error) {
    logger.error('Reorder list failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder list'
    });
  }
});

module.exports = router; 