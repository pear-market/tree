import { IndexedDBConnector } from 'anondb/web'

const schema = [
  {
    name: 'User',
    primaryKey: 'id',
    rows: [
      {
        name: 'id',
        unique: true,
        type: 'String',
      },
      {
        name: 'createdAt',
        type: 'Int',
      },
      ['username', 'String', { unique: true }],
    ],
  },
  {
    name: 'Auth',
    primaryKey: 'token',
    rows: [
      {
        name: 'token',
        type: 'String',
      },
      {
        name: 'createdAt',
        type: 'Int',
        index: true,
      },
      ['userId', 'String'],
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
      ['latestTurnNum', 'Int'],
      ['latestState', 'Object'],
      ['latestCounterSignature', 'String'],
    ],
  },
]

export default {
  state: {
    db: undefined,
  },
  mutations: {},
  actions: {
    initDB: async ({ state }) => {
      const db = await IndexedDBConnector.create(schema, 4)
      console.log(db)
      state.db = db
    },
  },
}
