import { getChannelId } from '@pearmarket/bls-statechannels'
import { ethers } from 'ethers'

export default {
  state: {
    latestState: undefined,
    balance: 0,
  },
  mutations: {},
  actions: {
    loadChannel: async ({ state, dispatch, rootState, commit }) => {
      if (rootState.contract.keyIndex === -1) {
        await dispatch('reservePubKeyIndex', null, { root: true })
      }
      await commit('logNormal', 'Loading state channel...', { root: true })
      const { data: channel } = await dispatch('send', {
        func: 'channel.info',
        data: {
          challenge: rootState.auth.blsChallenge,
          counterparty: rootState.contract.keyIndex,
        }
      })
      if (channel.id) {
        await commit('logNormal', { append: 'Loading state channel......done' }, { root: true })
        state.latestState = channel.latestState
        await dispatch('loadBalance')
      } else if (channel) {
        await commit('logNormal', { remove: 'Loading state channel...' }, { root: true })
        await dispatch('createChannel', channel.nonce)
      } else {
        throw new Error('Unexpected reponse')
      }
    },
    createChannel: async ({ state, dispatch, rootState, commit }, nonce) => {
      if (rootState.contract.keyIndex === -1) {
        await dispatch('reservePubKeyIndex', null, { root: true })
      }
      await commit('logNormal', 'Creating state channel...', { root: true })
      const { data: { state: _state, signature } } = await dispatch('send', {
        func: 'channel.create',
        data: {
          challenge: rootState.auth.blsChallenge,
          counterparty: rootState.contract.keyIndex,
          nonce,
        }
      }, { root: true })
      state.latestState = _state
      await commit('logNormal', { append: 'Creating state channel......done' }, { root: true })
      await dispatch('loadBalance')
    },
    loadBalance: async ({ state, rootState }) => {
      const channelId = getChannelId(state.latestState.channel)
      const balance = await rootState.contract.blsMove.holdings(ethers.constants.AddressZero, channelId)
      state.balance = balance
    },
    deposit: async ({ state, rootState }) => {
      const channelId = getChannelId(state.latestState.channel)
      const expectedAmount = state.latestState.outcome[0].allocations[0].amount
      const keyIndex = await rootState.contract.blsMove.indexByKey(rootState.bls.signer.pubkey)
      if (keyIndex === 0) {
        // need to request the index AND deposit
        await rootState.contract.blsMove.depositAndRequestKeyIndex(
          rootState.bls.signer.pubkey,
          rootState.contract.keyIndex,
          channelId,
          0,
          {
            value: expectedAmount,
          }
        )
      } else {
        // just deposit
        await rootState.contract.blsMove.deposit(
          ethers.constants.AddressZero,
          channelId,
          0,
          expectedAmount,
          {
            value: expectedAmount,
          }
        )
      }
    }
  }
}
