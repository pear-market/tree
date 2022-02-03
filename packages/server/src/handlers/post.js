const { auth, blsAuth } = require('../middleware/auth')

const vars = {}
module.exports = (app, _vars) => {
  Object.assign(vars, _vars)
  app.handle('post.create', auth(vars.db), createPost)
  app.handle('post.loadFeed', blsAuth(vars.db, true), loadPosts)
  app.handle('post.load', blsAuth(vars.db), loadFullPost)
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
  const { blsChallenge } = data
  const posts = await vars.db.findMany('Post', {
    where: {},
    orderBy: {
      createdAt: 'desc',
    }
  })
  const purchased = await vars.db.findMany('Purchase', {
    where: {
      postId: posts.map(({ id }) => id),
      ownerPublicKey: blsChallenge.publicKey,
    }
  })
  const purchasedById = purchased.reduce((acc, next) => {
    return {
      ...acc,
      [next.postId]: true,
    }
  }, {})
  send(posts.map((p) => ({
    ...p,
    fullText: purchasedById[p.id] ? p.fullText : '',
    purchased: !!purchasedById[p.id],
  })))
}

async function loadFullPost(data, send) {
  const { postId, blsChallenge } = data
  const existingPurchase = await vars.db.findOne('Purchase', {
    where: {
      ownerPublicKey: blsChallenge.publicKey,
      postId,
    }
  })
  if (!existingPurchase) {
    send('Post has not been purchased', 1)
    return
  }
  const post = await vars.db.findOne('Post', {
    where: {
      id: postId,
    }
  })
  send(post)
}
