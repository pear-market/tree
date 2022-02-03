import { getChannelId, signState } from '@pearmarket/bls-statechannels'
import { ethers } from 'ethers'

export default {
  state: {
    latestState: undefined,
    latestSignature: undefined,
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
      if (channel.needsInitialSig) {
        await commit('logNormal', { remove: 'Loading state channel...' }, { root: true })
        await commit('logNormal', 'Creating state channel...')
        // need to countersign
        const signature = await signState(channel.state, rootState.bls.signer)
        await dispatch('send', {
          func: 'channel.create',
          data: {
            challenge: rootState.auth.blsChallenge,
            state: channel.state,
            signature,
          }
        }, { root: true })
        await commit('logNormal', { append: 'Creating state channel......done'}, { root: true })
      } else {
        await commit('logNormal', { append: 'Loading state channel......done' }, { root: true })
      }
      state.latestState = channel.state
      state.latestSignature = channel.signature
      await dispatch('loadBalance')
    },
    purchasePost: async ({ state, rootState, dispatch, commit }, { id, price }) => {
      if (!state.latestState) throw new Error('No channel loaded')
      commit('logNormal', 'Signing purchase...', { root: true })
      const channelId = getChannelId(state.latestState.channel)
      const { data: nextState } = await dispatch('send', {
        func: 'post.purchase.state',
        data: {
          challenge: rootState.auth.blsChallenge,
          channelId,
          postId: id,
        },
      })
      // TODO: validate next state to make sure price changes are correct
      const signature = signState(nextState, rootState.bls.signer)
      const { data: { post } } = await dispatch('send', {
        func: 'post.purchase',
        data: {
          challenge: rootState.auth.blsChallenge,
          signature,
          state: nextState,
          postId: id,
        }
      })
      commit('logNormal', { append: 'Signing purchase......done' }, { root: true })
      commit('ingestPost', post, { root: true })
      state.latestState = nextState
    },
    loadBalance: async ({ state, rootState, dispatch }) => {
      const { data: channel } = await dispatch('send', {
        func: 'channel.info',
        data: {
          challenge: rootState.auth.blsChallenge,
          counterparty: rootState.contract.keyIndex,
        }
      })
      const channelId = getChannelId(state.latestState.channel)
      const balance = await rootState.contract.blsMove.holdings(ethers.constants.AddressZero, channelId)
      state.balance = balance
      if (+state.balance.toString() > 0 && !channel.isFunded) {
        await dispatch('send', {
          func: 'channel.refresh',
          data: {
            channelId,
          }
        })
      }
    },
    deposit: async ({ state, rootState, dispatch }) => {
      const channelId = getChannelId(state.latestState.channel)
      const expectedAmount = state.latestState.outcome[0].allocations[0].amount
      const keyIndex = await rootState.contract.blsMove.indexByKey(rootState.bls.signer.pubkey)
      let tx
      if (keyIndex === 0) {
        // need to request the index AND deposit
        tx = await rootState.contract.blsMove.depositAndRequestKeyIndex(
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
        tx = await rootState.contract.blsMove.deposit(
          ethers.constants.AddressZero,
          channelId,
          0,
          expectedAmount,
          {
            value: expectedAmount,
          }
        )
      }
      await tx.wait()
      await dispatch('send', {
        func: 'channel.refresh',
        data: {
          channelId,
        }
      })
    }
  }
}
