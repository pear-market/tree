const especial = require('especial/client')

export default {
  state: {
    url: 'ws://localhost:4000',
    client: undefined,
  },
  mutations: {},
  actions: {
    connect: async ({ state }) => {
      if (state.client) return
      const client = new especial(state.url)
      state.client = client
      await client.connect()
    },
    send: async ({ state, rootState }, { func, data }) => {
      if (!state.client || !state.client.connected)
        throw new Error('Client is not connected')
      const { token } = rootState.auth.auth || {}
      return state.client.send(func, {
        token,
        ...(data || {}),
      })
    },
  },
}
