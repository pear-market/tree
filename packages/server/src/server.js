const especial = require('especial')
const { DB, SQLiteConnector } = require('anondb/node')
const schema = require('./schema')
const {
  DOMAIN,
  signerFromSecret,
  BLSMoveAddress,
  AdjudicatorABI,
} = require('@pearmarket/bls-statechannels')
const { ethers } = require('ethers')
const path = require('path')

const GETH_URL = process.env.GETH_URL ?? 'ws://192.168.1.198:9546'

async function start() {
  // init the database
  const db = await SQLiteConnector.create(
    schema,
    process.env.DB_PATH ?? 'db.sqlite'
  )

  const signer = await signerFromSecret(process.env.BLS_SECRET ?? '0xabc123')

  // then create the server
  const app = especial()

  app.handle('utils.ping', (data, send, next) => send('pong'))

  const provider = new ethers.providers.WebSocketProvider(GETH_URL)
  const BLSMove = new ethers.Contract(BLSMoveAddress, AdjudicatorABI, provider)

  // require all handlers and pass the app and db to them
  const vars = {
    db,
    signer,
    BLSMove,
    keyIndex: 10299010101010,
  }
  require('not-index')(__dirname, 'handlers').map((handler) =>
    handler(app, vars)
  )

  const port = process.env.PORT || 4000
  const server = app.listen(port, (err) => {
    if (err) {
      console.log(err)
      process.exit(1)
    }
    console.log(`Listening on port ${port}`)
  })
}

start().catch((err) => {
  console.log('Uncaught error', err)
  process.exit(1)
})
