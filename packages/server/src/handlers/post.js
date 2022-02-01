const { auth } = require('../middleware/auth')

let db
module.exports = (app, _db) => {
  db = _db
  app.handle('post.create', auth(db), createPost)
  app.handle('post.loadFeed', loadPosts)
}

async function createPost(data, send) {
  const { auth } = data
  const post = await db.create('Post', {
    title: data.title,
    preview: data.preview,
    fullText: data.fullText,
    price: data.price,
    ownerId: auth.userId,
  })
  send(post)
}

async function loadPosts(data, send) {
  const posts = await db.findMany('Post', {
    where: {},
    orderBy: {
      createdAt: 'desc',
    }
  })
  send(posts)
}
