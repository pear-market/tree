export default {
  state: {
    postFeed: []
  },
  mutations: {},
  actions: {
    createPost: async ({ state, dispatch }, data) => {
      const { data: post } = await dispatch('send', {
        func: 'post.create',
        data,
      }, { root: true })
      await dispatch('loadPostFeed')
    },
    loadPostFeed: async ({ state, dispatch }) => {
      const { data: feed } = await dispatch('send', {
        func: 'post.loadFeed',
      }, { root: true })
      state.postFeed = feed
    }
  }
}
