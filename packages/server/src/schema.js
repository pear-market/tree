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
  {
    name: 'Channel',
    primaryKey: 'id',
    rows: [
      {
        name: 'id',
        unique: true,
        type: 'String',
      },
      ['nonce', 'Int'],
      ['chainId', 'Int'],
      ['counterparty', 'Int'],
      ['latestTurnNum', 'Int'],
      ['latestState', 'Object'],
      ['latestCounterSignature', 'String'],
      ['isFunded', 'Bool', { default: false }],
    ]
  },
  {
    name: 'BLSChallenge',
    primaryKey: 'challenge',
    rows: [
      {
        name: 'challenge',
        unique: true,
        type: 'String',
      },
      {
        name: 'createdAt',
        type: 'Int',
        default: () => +new Date(),
      },
      {
        name: 'expiresAt',
        type: 'Int',
        default: () => +new Date() + 1000*60*5,
      },
      ['isComplete', 'Bool', { default: false }],
      {
        name: 'responseSig',
        type: 'String',
        optional: true,
        unique: true,
      },
      {
        name: 'publicKey',
        type: 'String',
        optional: true,
      },
    ]
  },
  {
    name: 'Purchase',
    primaryKey: 'id',
    rows: [
      {
        name: 'id',
        type: 'String',
        default: () => nanoid(),
      },
      {
        name: 'createdAt',
        type: 'Int',
        default: () => +new Date(),
      },
      ['postId', 'String'],
      ['ownerPublicKey', 'String'],
      ['channelId', 'String'],
    ]
  }
]
