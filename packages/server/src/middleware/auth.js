const auth = (db) => async (data, send, next) => {
  data.auth = {}
  if (!data.token) {
    send('No auth token provided', 1)
    return
  }
  const auth = await db.findOne('Auth', {
    where: {
      token: data.token,
    }
  })
  if (!auth) {
    send('Invalid auth token provided', 1)
    return
  }
  // TODO: add expiration to token
  data.auth = auth
  next()
}

module.exports = { auth }
