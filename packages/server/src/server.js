const especial = require('especial')

const app = especial()

app.handle('utils.ping', (data, send, next) => send('pong'))

const port = process.env.PORT || 4000
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
