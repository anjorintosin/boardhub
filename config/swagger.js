const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BoardHub API',
      version: '1.0.0',
      description: 'A comprehensive API for BoardHub - A Trello-style project management tool',
      contact: {
        name: 'BoardHub Team',
        email: 'support@boardhub.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server'
      },
      {
        url: 'http://localhost:5001',
        description: 'Alternative development server'
      },
      {
        url: 'https://api.boardhub.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT token stored in HTTP-only cookie'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            avatar: {
              type: 'string',
              description: 'User avatar URL'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user account is active'
            },
            preferences: {
              type: 'object',
              properties: {
                theme: {
                  type: 'string',
                  enum: ['light', 'dark', 'system'],
                  description: 'User theme preference'
                },
                notifications: {
                  type: 'object',
                  properties: {
                    email: {
                      type: 'boolean',
                      description: 'Email notifications enabled'
                    },
                    push: {
                      type: 'boolean',
                      description: 'Push notifications enabled'
                    }
                  }
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date'
            }
          }
        },
        Board: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Board ID'
            },
            title: {
              type: 'string',
              description: 'Board title'
            },
            description: {
              type: 'string',
              description: 'Board description'
            },
            owner: {
              type: 'string',
              description: 'Board owner ID'
            },
            background: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['color', 'image'],
                  description: 'Background type'
                },
                value: {
                  type: 'string',
                  description: 'Background value (color code or image URL)'
                }
              }
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether the board is public'
            },
            isArchived: {
              type: 'boolean',
              description: 'Whether the board is archived'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Board tags'
            },
            lastActivity: {
              type: 'string',
              format: 'date-time',
              description: 'Last activity timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Board creation date'
            }
          }
        },
        List: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'List ID'
            },
            title: {
              type: 'string',
              description: 'List title'
            },
            board: {
              type: 'string',
              description: 'Board ID'
            },
            order: {
              type: 'number',
              description: 'List order'
            },
            description: {
              type: 'string',
              description: 'List description'
            },
            color: {
              type: 'string',
              description: 'List color'
            },
            isArchived: {
              type: 'boolean',
              description: 'Whether the list is archived'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'List creation date'
            }
          }
        },
        Card: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Card ID'
            },
            title: {
              type: 'string',
              description: 'Card title'
            },
            description: {
              type: 'string',
              description: 'Card description'
            },
            list: {
              type: 'string',
              description: 'List ID'
            },
            board: {
              type: 'string',
              description: 'Board ID'
            },
            order: {
              type: 'number',
              description: 'Card order'
            },
            color: {
              type: 'string',
              description: 'Card color'
            },
            labels: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Label name'
                  },
                  color: {
                    type: 'string',
                    description: 'Label color'
                  }
                }
              }
            },
            assignees: {
              type: 'array',
              items: {
                type: 'string',
                description: 'User ID'
              },
              description: 'Assigned users'
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Due date'
            },
            isCompleted: {
              type: 'boolean',
              description: 'Whether the card is completed'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Card priority'
            },
            isArchived: {
              type: 'boolean',
              description: 'Whether the card is archived'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Card creation date'
            }
          }
        },
        BoardMember: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Member ID'
            },
            board: {
              type: 'string',
              description: 'Board ID'
            },
            user: {
              type: 'string',
              description: 'User ID'
            },
            role: {
              type: 'string',
              enum: ['owner', 'admin', 'editor', 'viewer'],
              description: 'Member role'
            },
            permissions: {
              type: 'object',
              properties: {
                canEditBoard: {
                  type: 'boolean',
                  description: 'Can edit board settings'
                },
                canDeleteBoard: {
                  type: 'boolean',
                  description: 'Can delete board'
                },
                canInviteMembers: {
                  type: 'boolean',
                  description: 'Can invite new members'
                },
                canRemoveMembers: {
                  type: 'boolean',
                  description: 'Can remove members'
                },
                canCreateLists: {
                  type: 'boolean',
                  description: 'Can create lists'
                },
                canEditLists: {
                  type: 'boolean',
                  description: 'Can edit lists'
                },
                canDeleteLists: {
                  type: 'boolean',
                  description: 'Can delete lists'
                },
                canCreateCards: {
                  type: 'boolean',
                  description: 'Can create cards'
                },
                canEditCards: {
                  type: 'boolean',
                  description: 'Can edit cards'
                },
                canDeleteCards: {
                  type: 'boolean',
                  description: 'Can delete cards'
                },
                canMoveCards: {
                  type: 'boolean',
                  description: 'Can move cards'
                },
                canComment: {
                  type: 'boolean',
                  description: 'Can add comments'
                }
              }
            },
            invitedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Invitation date'
            },
            joinedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Join date'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field name'
                  },
                  message: {
                    type: 'string',
                    description: 'Validation message'
                  }
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      },
      {
        cookieAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './server.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs; 