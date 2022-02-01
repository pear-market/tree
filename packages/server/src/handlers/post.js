const { auth } = require('../middleware/auth')

const vars = {}
module.exports = (app, _vars) => {
  Object.assign(vars, _vars)
  app.handle('post.create', auth(vars.db), createPost)
  app.handle('post.loadFeed', loadPosts)
}

async function createPost(data, send) {
  const { auth } = data
  const post = await vars.db.create('Post', {
    title: data.title,
    preview: data.preview,
    fullText: data.fullText,
    price: data.price,
    ownerId: auth.userId,
  })
  send(post)
}

async function loadPosts(data, send) {
  const posts = await vars.db.findMany('Post', {
    where: {},
    orderBy: {
      createdAt: 'desc',
    }
  })
  send(posts)
}
