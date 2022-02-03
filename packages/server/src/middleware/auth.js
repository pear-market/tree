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

const blsAuth = (db) => async (data, send, next) => {
  data.blsChallenge = {}
  if (!data.challenge) {
    send('No bls challenge provided', 1)
    return
  }
  const blsChallenge = await db.findOne('BLSChallenge', {
    where: {
      challenge: data.challenge,
    }
  })
  if (!blsChallenge) {
    send('No challenge found', 1)
  } else if (!blsChallenge.isComplete) {
    send('Challenge not complete', 1)
  } else {
    data.blsChallenge = blsChallenge
    next()
  }
}

module.exports = { auth, blsAuth }
