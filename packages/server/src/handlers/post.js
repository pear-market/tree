const { auth } = require('../middleware/auth')

module.exports = (app, db) => {
  app.handle('post.create', auth, async (data, send) => {
    
  })
}
