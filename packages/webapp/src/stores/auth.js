import { serializeHexArr } from '@pearmarket/bls-statechannels'

export default {
  state: {
    user: undefined,
    auth: undefined,
    blsChallengeSig: undefined,
  },
  mutations: {},
  actions: {
    init: async ({ state, rootState }) => {
      const { db } = rootState.storage
      const auth = await db.findOne('Auth', {
        where: {},
        orderBy: {
          createdAt: 'desc',
        },
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
      const {
        data: { user, auth },
      } = await dispatch(
        'send',
        {
          func: 'user.create',
          data,
        },
        { root: true }
      )
      await dispatch('_authenticate', { user, auth })
    },
    login: async ({ state, dispatch }, data) => {
      const {
        data: { user, auth },
      } = await dispatch(
        'send',
        {
          func: 'user.login',
          data,
        },
        { root: true }
      )
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
        where: { token: auth.token },
        create: auth,
        update: auth,
      })
      state.user = user
      state.auth = auth
    },
    blsAuth: async ({ state, rootState, dispatch }) => {
      const { data: challenge } = await dispatch('send', {
        func: 'bls.auth.challenge',
      }, { root: true })
      // sign the challenge string then return in
      const signature = await dispatch('signHex', challenge.challenge)
      const pubkey = await rootState.bls.signer.pubkey
      const { data: res } = await dispatch('send', {
        func: 'bls.auth.respond',
        data: {
          challenge: challenge.challenge,
          responseSig: serializeHexArr(signature),
          publicKey: serializeHexArr(pubkey),
        }
      })
      state.blsChallengeSig = serializeHexArr(signature)
    }
  },
}
