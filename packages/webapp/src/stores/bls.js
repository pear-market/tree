import { signer } from '@thehubbleproject/bls'
import { Buffer } from 'buffer/'
import sha256 from 'js-sha256'

export default {
  state: {
    factory: undefined,
    signer: undefined,
    domain: '8ea88ea88ea88ea88ea88ea88ea88ea88ea88ea88ea88ea88ea88ea88ea88ea8',
  },
  mutations: {},
  actions: {
    init: async ({ state, dispatch }) => {
      state.factory = await signer.BlsSignerFactory.new()
    },
    createSigner: async ({ state, dispatch }) => {
      const signature = await dispatch('keySignature', null, { root: true })
      state.signer = state.factory.getSigner(
        Buffer.from(state.domain, 'hex'),
        signature
      )
    },
    sign: async ({ state }, data) => {
      if (typeof data !== 'string') throw new Error('Expected string')
      return state.signer.sign(`0x${Buffer.from(data).toString('hex')}`)
    },
  },
}
