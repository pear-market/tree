const especial = require('especial')
const { DB, SQLiteConnector } = require('anondb/node')
const schema = require('./schema')

async function start() {
  // init the database
  const db = await SQLiteConnector.create(schema, 'db.sqlite')

  // then create the server
  const app = especial()

  app.handle('utils.ping', (data, send, next) => send('pong'))
  require('./handlers/user')(app, db)

  const port = process.env.PORT || 4000
  const server = app.listen(port, (err) => {
    if (err) {
      console.log(err)
      process.exit(1)
    }
    console.log(`Listening on port ${port}`)
  })
}

start()
  .catch((err) => {
    console.log('Uncaught error', err)
    process.exit(1)
  })
