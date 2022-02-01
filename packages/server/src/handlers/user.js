const bcrypt = require('bcryptjs')
// const { auth } = require('../middlewares/auth')
const { nanoid } = require('nanoid')

const vars = {}
module.exports = (app, _vars) => {
  Object.assign(vars, _vars)
  app.handle('user.create', userCreate)
  app.handle('user.login', userLogin)
}

async function userCreate(data, send) {
  const { username, password } = data
  if (typeof username !== 'string' || username.length < 2) {
    send('Username must be at least 3 characters', 1)
    return
  }
  if (typeof password !== 'string' || password.length < 5) {
    send('Password must be at least 6 characters', 1)
    return
  }
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(password, salt)
  const userId = nanoid()
  await vars.db.transaction((_db) => {
    _db.create('User', {
      id: userId,
      username,
    })
    _db.create('UserPassword', {
      salt,
      hash: passwordHash,
      userId,
    })
  })
  // now let's make them a fresh auth token
  const auth = await vars.db.create('Auth', {
    userId,
  })
  const user = await vars.db.findOne('User', { id: userId })
  send({
    user,
    auth,
  })
}

async function userLogin(data, send) {
  const { username, password } = data
  const user = await vars.db.findOne('User', {
    where: {
      username,
    },
  })
  if (!user) {
    send(`No user found with username "${username}"`, 1)
    return
  }
  const passwordData = await vars.db.findOne('UserPassword', {
    where: {
      userId: user.id,
    },
  })
  if (!passwordData) {
    send('No password saved for user', 1)
    return
  }
  const { hash } = passwordData
  const passwordValid = await bcrypt.compare(password, hash)
  if (!passwordValid) {
    send('Password is incorrect', 1)
    return
  }
  const auth = await vars.db.create('Auth', {
    userId: user.id,
  })
  send({
    user,
    auth,
  })
}
