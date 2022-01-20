export default {
  state: {
    user: undefined,
    auth: undefined,
  },
  mutations: {},
  actions: {
    createAccount: async ({ state, dispatch }, data) => {
      const { data: { user, auth } } = await dispatch('send', {
        func: 'user.create',
        data,
      }, { root: true })
      state.user = user
      state.auth = auth
    },
    login: async ({ state, dispatch }, data) => {
      const { data: { user, auth, } } = await dispatch('send', {
        func: 'user.login',
        data,
      }, { root: true })
      state.user = user
      state.auth = auth
    }
  }
}
