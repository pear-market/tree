import { ethers } from 'ethers'
import {
  BLSMoveAddress,
  AdjudicatorABI,
} from '@pearmarket/bls-statechannels'

const GETH_URL = 'ws://192.168.1.198:9546'

export default {
  state: {
    keyIndex: -1,
    pubKeyCache: undefined,
    blsMove: undefined
  },
  mutations: {},
  actions: {
    init: async ({ state }) => {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      state.blsMove = new ethers.Contract(
        BLSMoveAddress,
        AdjudicatorABI,
        provider.getSigner()
      )
    },
    loadPubKeyIndex: async ({ state }, pubkey) => {
      if (!Array.isArray(pubkey) || pubkey.length !== 4)
        throw new Error('Invalid pubkey')
      const existingIndex = await state.blsMove.indexByKey(pubkey)
      state.keyIndex = existingIndex === 0 ? -1 : existingIndex
      return existingIndex === 0 ? -1 : existingIndex
    },
    registerPubKey: async ({ state }, pubkey) => {
      if (!Array.isArray(pubkey) || pubkey.length !== 4)
        throw new Error('Invalid pubkey')
      const tx = await state.blsMove.registerPublicKey(pubkey)
      await tx.wait()
    },
    reservePubKeyIndex: async ({ state, dispatch, rootState }, pubkey) => {
      if (state.keyIndex > 0) return
      await dispatch('loadPubKeyIndex', rootState.bls.signer.pubkey)
      if (state.keyIndex > 0) return
      const firstRequestableKey = await state.blsMove.firstRequestableKey()
      for (;;) {
        const reserveValue = firstRequestableKey + Math.floor((Math.random() * firstRequestableKey))
        try {
          await state.blsMove.estimateGas.registerPublicKeyIndex(rootState.bls.signer.pubkey, reserveValue)
          state.keyIndex = reserveValue
          return
        } catch (err) {}

      }
    }
  },
}
