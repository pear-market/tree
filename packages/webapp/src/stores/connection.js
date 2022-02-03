const especial = require('especial/client')

// const WS_URL = 'ws://localhost:4000'
const WS_URL = 'wss://ws.peartree.tubby.cloud'

export default {
  state: {
    url: WS_URL,
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
    send: async ({ state, rootState, dispatch }, { func, data }) => {
      if (!state.client) {
        await dispatch('connect')
      }
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
