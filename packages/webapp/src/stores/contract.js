import { ethers } from 'ethers'
import BLSKeyCache from '@pearmarket/bls-statechannels/src/abi/BLSKeyCache.json'

const GETH_URL = 'ws://192.168.1.198:9546'
const KEY_CACHE_ADDRESS = '0xff7184b579ccB9843a8Fe4372bc1096aC70aC15e'

export default {
  state: {
    pubKeyCache: undefined,
  },
  mutations: {},
  actions: {
    init: async ({ state }) => {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      state.pubKeyCache = new ethers.Contract(
        KEY_CACHE_ADDRESS,
        BLSKeyCache,
        provider.getSigner()
      )
    },
    loadPubKeyIndex: async ({ state }, pubkey) => {
      if (!Array.isArray(pubkey) || pubkey.length !== 4)
        throw new Error('Invalid pubkey')
      const existingIndex = await state.pubKeyCache.indexByKey(pubkey)
      return existingIndex === 0 ? -1 : existingIndex
    },
    registerPubKey: async ({ state }, pubkey) => {
      if (!Array.isArray(pubkey) || pubkey.length !== 4)
        throw new Error('Invalid pubkey')
      const tx = await state.pubKeyCache.registerPublicKey(pubkey)
      await tx.wait()
    },
  },
}