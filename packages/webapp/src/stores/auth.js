export default {
  state: {
    user: undefined,
    auth: undefined,
  },
  mutations: {},
  actions: {
    init: async ({ state, rootState }) => {
      const { db } = rootState.storage
      const auth = await db.findOne('Auth', {
        where: {},
        orderBy: {
          createdAt: 'desc'
        }
      })
      if (!auth) return
      const user = await db.findOne('User', {
        where: {
          id: auth.userId,
        },
      })
      if (!user) return
      state.user = user
      state.auth = auth
    },
    createAccount: async ({ state, dispatch }, data) => {
      const { data: { user, auth } } = await dispatch('send', {
        func: 'user.create',
        data,
      }, { root: true })
      await dispatch('_authenticate', { user, auth })
    },
    login: async ({ state, dispatch }, data) => {
      const { data: { user, auth, } } = await dispatch('send', {
        func: 'user.login',
        data,
      }, { root: true })
      await dispatch('_authenticate', { user, auth })
    },
    _authenticate: async ({ state, dispatch, rootState }, { user, auth }) => {
      const { db } = rootState.storage
      db.upsert('User', {
        where: { userId: user.id },
        create: user,
        update: user,
      })
      db.upsert('Auth', {
        where: { token: auth.token, },
        create: auth,
        update: auth,
      })
      state.user = user
      state.auth = auth
    }
  }
}
