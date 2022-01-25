export default {
  state: {
    metamaskConnected: false,
    chainId: -1,
    accounts: [],
  },
  mutations: {},
  actions: {
    init: async ({ dispatch }) => {
      await dispatch('connectMetamask')
    },
    connectMetamask: async ({ state, dispatch }) => {
      if (!window.ethereum) {
        throw new Error('Metamask not detected')
      }
      state.metamaskConnected = window.ethereum.isConnected()
      state.chainId = window.ethereum.chainId
      window.ethereum.removeAllListeners('chainChanged')
      window.ethereum.removeAllListeners('connect')
      window.ethereum.removeAllListeners('disconnect')
      window.ethereum.removeAllListeners('accountsChanged')
      window.ethereum.on('chainChanged', (chainId) => {
        state.chainId = chainId
        dispatch('reloadState')
      })
      window.ethereum.on('connect', () => {
        state.metamaskConnected = window.ethereum.isConnected()
      })
      window.ethereum.on('disconnect', () => {
        state.metamaskConnected = window.ethereum.isConnected()
      })
      window.ethereum.on('accountsChanged', (accounts) => {
        state.accounts = accounts
        dispatch('reloadState')
      })
      state.accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })
    },
    reloadState: async ({ state, dispatch }) => {
      await Promise.all([
        Promise.resolve(),
        // dispatch('loadBalance'),
        // dispatch('loadTokenBalances'),
        // // reset the zkopru wallet state
        // dispatch('resetWallet', null, { root: true }),
      ])
    },
    keySignature: async ({ state }) => {
      const msgParams = JSON.stringify({
        domain: {
          chainId: 5,
          name: 'Pear BLS',
          version: '0',
        },
        message: {
          info: 'Unlock BLS',
          warning:
            'This signature is your key, only sign on official Pear Market websites!',
        },
        primaryType: 'PearKey',
        types: {
          PearKey: [
            { name: 'info', type: 'string' },
            { name: 'warning', type: 'string' },
          ],
        },
      })
      const signedData = await window.ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [state.accounts[0], msgParams],
      })
      return signedData
    },
  },
}
