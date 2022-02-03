const auth = (db) => async (data, send, next) => {
  data.auth = {}
  if (!data.token) {
    send('No auth token provided', 1)
    return
  }
  const auth = await db.findOne('Auth', {
    where: {
      token: data.token,
    },
  })
  if (!auth) {
    send('Invalid auth token provided', 1)
    return
  }
  // TODO: add expiration to token
  data.auth = auth
  next()
}

const blsAuth =
  (db, optional = false) =>
  async (data, send, next) => {
    data.blsChallenge = {}
    if (!data.challenge) {
      if (!optional) send('No bls challenge provided', 1)
      else next()
      return
    }
    const blsChallenge = await db.findOne('BLSChallenge', {
      where: {
        challenge: data.challenge,
      },
    })
    if (!blsChallenge) {
      if (!optional) send('No challenge found', 1)
      else next()
    } else if (!blsChallenge.isComplete) {
      if (!optional) send('Challenge not complete', 1)
      else next()
    } else {
      data.blsChallenge = blsChallenge
      next()
    }
  }

module.exports = { auth, blsAuth }
