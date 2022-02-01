import { Buffer } from 'buffer/'
import {
  signerFromSecret,
} from '@pearmarket/bls-statechannels'

export default {
  state: {
    signer: undefined,
  },
  mutations: {},
  actions: {
    createSigner: async ({ state, dispatch }) => {
      const signature = await dispatch('keySignature', null, { root: true })
      state.signer = await signerFromSecret(signature)
    },
    sign: async ({ state }, data) => {
      if (typeof data !== 'string') throw new Error('Expected string')
      return state.signer.sign(`0x${Buffer.from(data).toString('hex')}`)
    },
    signHex: async ({ state }, data) => {
      if (typeof data !== 'string') throw new Error('Expected string')
      return state.signer.sign(`0x${data.replace('0x', '')}`)
    }
  },
}
