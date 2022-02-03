export default {
  state: {
    postFeed: []
  },
  mutations: {
    ingestPost: (state, post) => {
      state.postFeed = state.postFeed.map((p) => p.id === post.id ? post : p)
    }
  },
  actions: {
    createPost: async ({ state, dispatch }, data) => {
      const { data: post } = await dispatch('send', {
        func: 'post.create',
        data,
      }, { root: true })
      await dispatch('loadPostFeed')
    },
    loadPostFeed: async ({ state, dispatch, rootState }) => {
      const { data: feed } = await dispatch('send', {
        func: 'post.loadFeed',
        data: {
          challenge: rootState.auth.blsChallenge,
        }
      }, { root: true })
      state.postFeed = feed
    }
  }
}
