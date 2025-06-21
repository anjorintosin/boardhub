const express = require('express');
const { body, param, query } = require('express-validator');
const Board = require('../models/Board');
const BoardMember = require('../models/BoardMember');
const List = require('../models/List');
const Card = require('../models/Card');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { logger } = require('../utils/logger');

const router = express.Router();

// Middleware to check board access
const checkBoardAccess = async (req, res, next) => {
  try {
    const boardId = req.params.id || req.params.boardId;
    const board = await Board.findById(boardId);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check if user is owner
    if (board.owner.toString() === req.user._id.toString()) {
      req.board = board;
      req.userRole = 'owner';
      return next();
    }

    // Check if board is public
    if (board.isPublic) {
      req.board = board;
      req.userRole = 'viewer';
      return next();
    }

    // Check membership
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

    req.board = board;
    req.userRole = membership.role;
    req.membership = membership;
    next();
  } catch (error) {
    logger.error('Board access check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check board access'
    });
  }
};

// Apply authentication to all routes
router.use(protect);

/**
 * @swagger
 * /api/boards:
 *   get:
 *     summary: Get all boards for current user
 *     tags: [Boards]
 *     description: Retrieve all boards that the current user has access to
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of boards per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search boards by title
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title, lastActivity]
 *           default: lastActivity
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Boards retrieved successfully
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
 *                     boards:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Board'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         pages:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Not authenticated
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
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort').optional().isIn(['createdAt', 'updatedAt', 'title', 'lastActivity']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
], validate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const sort = req.query.sort || 'lastActivity';
    const order = req.query.order || 'desc';

    const skip = (page - 1) * limit;

    // Build query
    let query = { 
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Get boards with pagination
    const boards = await Board.find(query)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Board.countDocuments(query);

    logger.info('Boards retrieved', { userId: req.user._id, count: boards.length });

    res.json({
      success: true,
      data: {
        boards,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get boards failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve boards'
    });
  }
});

/**
 * @swagger
 * /api/boards:
 *   post:
 *     summary: Create a new board
 *     tags: [Boards]
 *     description: Create a new board for the current user
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
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Board title
 *                 example: "Project Alpha"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Board description
 *                 example: "Main project board for Alpha development"
 *               background:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [color, image]
 *                     description: Background type
 *                     example: "color"
 *                   value:
 *                     type: string
 *                     description: Background value (color code or image URL)
 *                     example: "#0079bf"
 *               isPublic:
 *                 type: boolean
 *                 description: Whether the board is public
 *                 example: false
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Board tags
 *                 example: ["development", "frontend"]
 *     responses:
 *       201:
 *         description: Board created successfully
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
 *                   example: "Board created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     board:
 *                       $ref: '#/components/schemas/Board'
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
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('background.type')
    .optional()
    .isIn(['color', 'image'])
    .withMessage('Background type must be color or image'),
  body('background.value')
    .optional()
    .notEmpty()
    .withMessage('Background value is required when type is specified'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
], validate, async (req, res) => {
  try {
    const { title, description, background, isPublic, tags } = req.body;

    const board = await Board.create({
      title,
      description,
      background,
      isPublic: isPublic || false,
      tags: tags || [],
      owner: req.user._id
    });

    // Add owner as member with owner role
    await BoardMember.create({
      board: board._id,
      user: req.user._id,
      role: 'owner',
      permissions: {
        canEditBoard: true,
        canDeleteBoard: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canCreateLists: true,
        canEditLists: true,
        canDeleteLists: true,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: true,
        canMoveCards: true,
        canComment: true
      }
    });

    await board.populate('owner', 'name email avatar');

    logger.info('Board created', { userId: req.user._id, boardId: board._id });

    res.status(201).json({
      success: true,
      message: 'Board created successfully',
      data: {
        board
      }
    });
  } catch (error) {
    logger.error('Create board failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create board'
    });
  }
});

/**
 * @swagger
 * /api/boards/{id}:
 *   get:
 *     summary: Get board by ID
 *     tags: [Boards]
 *     description: Retrieve a specific board by ID with full details
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     responses:
 *       200:
 *         description: Board retrieved successfully
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
 *                     board:
 *                       $ref: '#/components/schemas/Board'
 *                     memberRole:
 *                       type: string
 *                       enum: [owner, admin, editor, viewer]
 *                       description: Current user's role in this board
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
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid board ID')
], validate, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .populate({
        path: 'lists',
        populate: {
          path: 'cards',
          populate: 'assignees'
        }
      });

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check if user has access
    const hasAccess = board.owner.equals(req.user._id) || 
                     board.members.some(member => member.user.equals(req.user._id)) ||
                     board.isPublic;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get user's role
    let memberRole = null;
    if (board.owner.equals(req.user._id)) {
      memberRole = 'owner';
    } else {
      const member = board.members.find(m => m.user.equals(req.user._id));
      memberRole = member ? member.role : null;
    }

    logger.info('Board retrieved', { userId: req.user._id, boardId: board._id });

    res.json({
      success: true,
      data: {
        board,
        memberRole
      }
    });
  } catch (error) {
    logger.error('Get board failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve board'
    });
  }
});

/**
 * @swagger
 * /api/boards/{id}:
 *   put:
 *     summary: Update board
 *     tags: [Boards]
 *     description: Update board details (requires edit permissions)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
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
 *                 description: Board title
 *                 example: "Updated Project Alpha"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Board description
 *                 example: "Updated project board description"
 *               background:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [color, image]
 *                     description: Background type
 *                     example: "color"
 *                   value:
 *                     type: string
 *                     description: Background value (color code or image URL)
 *                     example: "#ff6b6b"
 *               isPublic:
 *                 type: boolean
 *                 description: Whether the board is public
 *                 example: true
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Board tags
 *                 example: ["development", "frontend", "updated"]
 *     responses:
 *       200:
 *         description: Board updated successfully
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
 *                   example: "Board updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     board:
 *                       $ref: '#/components/schemas/Board'
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
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid board ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('background.type')
    .optional()
    .isIn(['color', 'image'])
    .withMessage('Background type must be color or image'),
  body('background.value')
    .optional()
    .notEmpty()
    .withMessage('Background value is required when type is specified'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
], validate, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check permissions
    const canEdit = await authorize(req.user._id, board._id, 'canEditBoard');
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to edit this board'
      });
    }

    const { title, description, background, isPublic, tags } = req.body;
    const updateFields = {};

    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (background !== undefined) updateFields.background = background;
    if (isPublic !== undefined) updateFields.isPublic = isPublic;
    if (tags !== undefined) updateFields.tags = tags;

    const updatedBoard = await Board.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('owner', 'name email avatar');

    logger.info('Board updated', { userId: req.user._id, boardId: board._id });

    res.json({
      success: true,
      message: 'Board updated successfully',
      data: {
        board: updatedBoard
      }
    });
  } catch (error) {
    logger.error('Update board failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update board'
    });
  }
});

/**
 * @swagger
 * /api/boards/{id}:
 *   delete:
 *     summary: Delete board
 *     tags: [Boards]
 *     description: Delete a board (requires delete permissions)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     responses:
 *       200:
 *         description: Board deleted successfully
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
 *                   example: "Board deleted successfully"
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
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid board ID')
], validate, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check permissions
    const canDelete = await authorize(req.user._id, board._id, 'canDeleteBoard');
    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete this board'
      });
    }

    await Board.findByIdAndDelete(req.params.id);

    logger.info('Board deleted', { userId: req.user._id, boardId: board._id });

    res.json({
      success: true,
      message: 'Board deleted successfully'
    });
  } catch (error) {
    logger.error('Delete board failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete board'
    });
  }
});

// @desc    Get board members
// @route   GET /api/boards/:id/members
// @access  Private
router.get('/:id/members', [
  param('id').isMongoId().withMessage('Invalid board ID')
], validate, protect, checkBoardAccess, async (req, res) => {
  try {
    const members = await BoardMember.find({ board: req.params.id, isActive: true })
      .populate('user', 'name email avatar')
      .populate('invitedBy', 'name email avatar')
      .sort({ role: 1, invitedAt: 1 });

    res.json({
      success: true,
      data: {
        members: members.map(member => member.getMemberInfo())
      }
    });
  } catch (error) {
    logger.error('Get board members failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get board members'
    });
  }
});

// @desc    Invite member to board
// @route   POST /api/boards/:id/members
// @access  Private
router.post('/:id/members', [
  param('id').isMongoId().withMessage('Invalid board ID'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .isIn(['admin', 'editor', 'viewer'])
    .withMessage('Role must be admin, editor, or viewer')
], validate, protect, checkBoardAccess, async (req, res) => {
  try {
    // Check if user has permission to invite members
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      if (!req.membership?.permissions?.canInviteMembers) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to invite members'
        });
      }
    }

    const { email, role } = req.body;

    // Find user by email
    const User = require('../models/User');
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a member
    const existingMember = await BoardMember.findOne({
      board: req.params.id,
      user: user._id
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this board'
      });
    }

    // Create membership
    const membership = await BoardMember.create({
      board: req.params.id,
      user: user._id,
      role,
      invitedBy: req.user._id
    });

    const populatedMembership = await BoardMember.findById(membership._id)
      .populate('user', 'name email avatar')
      .populate('invitedBy', 'name email avatar');

    logger.info('Member invited to board', { 
      boardId: req.params.id, 
      userId: user._id, 
      invitedBy: req.user._id 
    });

    res.status(201).json({
      success: true,
      message: 'Member invited successfully',
      data: {
        member: populatedMembership.getMemberInfo()
      }
    });
  } catch (error) {
    logger.error('Invite member failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invite member'
    });
  }
});

// @desc    Update member role
// @route   PUT /api/boards/:id/members/:memberId
// @access  Private
router.put('/:id/members/:memberId', [
  param('id').isMongoId().withMessage('Invalid board ID'),
  param('memberId').isMongoId().withMessage('Invalid member ID'),
  body('role')
    .isIn(['admin', 'editor', 'viewer'])
    .withMessage('Role must be admin, editor, or viewer')
], validate, protect, checkBoardAccess, async (req, res) => {
  try {
    // Check if user has permission to manage members
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage members'
      });
    }

    const { role } = req.body;

    const membership = await BoardMember.findOneAndUpdate(
      { 
        _id: req.params.memberId, 
        board: req.params.id 
      },
      { role },
      { new: true }
    ).populate('user', 'name email avatar');

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    logger.info('Member role updated', { 
      boardId: req.params.id, 
      memberId: req.params.memberId, 
      userId: req.user._id 
    });

    res.json({
      success: true,
      message: 'Member role updated successfully',
      data: {
        member: membership.getMemberInfo()
      }
    });
  } catch (error) {
    logger.error('Update member role failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update member role'
    });
  }
});

// @desc    Remove member from board
// @route   DELETE /api/boards/:id/members/:memberId
// @access  Private
router.delete('/:id/members/:memberId', [
  param('id').isMongoId().withMessage('Invalid board ID'),
  param('memberId').isMongoId().withMessage('Invalid member ID')
], validate, protect, checkBoardAccess, async (req, res) => {
  try {
    // Check if user has permission to remove members
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      if (!req.membership?.permissions?.canRemoveMembers) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to remove members'
        });
      }
    }

    const membership = await BoardMember.findOneAndDelete({
      _id: req.params.memberId,
      board: req.params.id
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    logger.info('Member removed from board', { 
      boardId: req.params.id, 
      memberId: req.params.memberId, 
      userId: req.user._id 
    });

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    logger.error('Remove member failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member'
    });
  }
});

module.exports = router; 