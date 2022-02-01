const especial = require('especial')
const { DB, SQLiteConnector } = require('anondb/node')
const schema = require('./schema')
const { DOMAIN, signerFromSecret } = require('@pearmarket/bls-statechannels')

async function start() {
  // init the database
  const db = await SQLiteConnector.create(schema, 'db.sqlite')

  const signer = await signerFromSecret(process.env.BLS_SECRET ?? '0xabc123')

  // then create the server
  const app = especial()

  app.handle('utils.ping', (data, send, next) => send('pong'))

  // require all handlers and pass the app and db to them
  require('not-index')(__dirname, 'handlers').map((handler) => handler(app, { db, signer }))

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
