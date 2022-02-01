const { nanoid } = require('nanoid')

module.exports = [
  {
    name: 'User',
    primaryKey: 'id',
    rows: [
      {
        name: 'id',
        unique: true,
        type: 'String',
        default: () => nanoid(),
      },
      {
        name: 'createdAt',
        type: 'Int',
        default: () => +new Date(),
      },
      ['username', 'String', { unique: true }],
    ],
  },
  {
    name: 'UserPassword',
    primaryKey: 'salt',
    rows: [
      ['salt', 'String'],
      ['hash', 'String'],
      ['userId', 'String'],
      {
        name: 'createdAt',
        type: 'Int',
        default: () => +new Date(),
      },
    ],
  },
  {
    name: 'Auth',
    primaryKey: 'token',
    rows: [
      {
        name: 'token',
        type: 'String',
        default: () => nanoid(30),
      },
      {
        name: 'createdAt',
        type: 'Int',
        default: () => +new Date(),
      },
      ['userId', 'String'],
    ],
  },
  {
    name: 'Post',
    primaryKey: 'id',
    rows: [
      {
        name: 'id',
        unique: true,
        type: 'String',
        default: () => nanoid(),
      },
      ['title', 'String'],
      {
        name: 'createdAt',
        type: 'Int',
        default: () => +new Date(),
      },
      ['ownerId', 'String'],
      ['preview', 'String', { optional: true }],
      ['fullText', 'String'],
      ['price', 'String'],
    ],
  },
]
