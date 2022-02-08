const { ethers } = require('hardhat')
const {
  randomSigner,
  signState,
  getChannelId,
  hashState,
  getFixedPart,
  getVariablePart,
  messageToHash,
  hashAppPart,
  hashOutcome,
  DOMAIN,
  aggregate,
} = require('../src')
const assert = require('assert')

async function getDeployedContracts() {
  const BLSKeyCache = await ethers.getContractFactory('BLSKeyCache')
  const cache = await BLSKeyCache.deploy()
  await cache.deployed()

  const BLSEstimator = await ethers.getContractFactory(
    'BNPairingPrecompileCostEstimator'
  )
  const blsEstimator = await BLSEstimator.deploy()
  await blsEstimator.deployed()

  const BLSMoveApp = await ethers.getContractFactory('BLSMoveApp')
  const blsMoveApp = await BLSMoveApp.deploy()
  await blsMoveApp.deployed()

  const BLSOpen = await ethers.getContractFactory('BLSOpen', {
    libraries: {
      BNPairingPrecompileCostEstimator: blsEstimator.address,
    },
  })
  const blsOpen = await BLSOpen.deploy()
  await blsOpen.deployed()

  const BLSMove = await ethers.getContractFactory('BLSMove', {
    libraries: {
      BLSOpen: blsOpen.address,
    },
  })
  const blsMove = await BLSMove.deploy(blsMoveApp.address, 100000, DOMAIN)
  await blsMove.deployed()
  return { blsMove, blsOpen, cache }
}

describe('state channels', () => {
  describe('checkpoint conclude', () => {
    it('signs a state and creates a checkpoint then concludes', async () => {
      const { chainId } = await ethers.provider.getNetwork()
      const [user] = await ethers.getSigners()
      const { blsMove } = await getDeployedContracts()
      const wallet = await randomSigner(DOMAIN)
      {
        // register the signer
        const tx = await blsMove.connect(user).registerPublicKey(wallet.pubkey)
        await tx.wait()
      }
      const state = {
        channel: {
          chainId,
          nonce: 0x01,
          participants: [1],
        },
        outcome: [],
        turnNum: 1,
        isFinal: false,
        appData: '0x00',
      }
      {
        const signedState = await signState(state, wallet)
        const message = messageToHash(hashState(state))
        // console.log(message.map(m => ethers.BigNumber.from(m).toString()))
        const tx = await blsMove
          .connect(user)
          .checkpoint(
            getFixedPart(state),
            1,
            [getVariablePart(state)],
            0,
            [0],
            {
              sig: signedState,
              pubKeys: [1],
              messages: [message],
            }
          )
        await tx.wait()
      }
      const finalState = {
        channel: {
          chainId,
          nonce: 0x01,
          participants: [1],
        },
        outcome: [],
        turnNum: 2,
        isFinal: true,
        appData: '0x00',
      }

      {
        const signedState = await signState(finalState, wallet)
        const message = messageToHash(hashState(finalState), DOMAIN)
        const tx = await blsMove
          .connect(user)
          .conclude(
            2,
            getFixedPart(finalState),
            hashAppPart(finalState),
            hashOutcome(finalState.outcome),
            1,
            [0],
            {
              sig: signedState,
              pubKeys: [1],
              messages: [message],
            }
          )
        await tx.wait()
      }
    })
    it('should multiconclude', async () => {
      const { chainId } = await ethers.provider.getNetwork()
      const [user1, user2] = await ethers.getSigners()
      const { blsMove } = await getDeployedContracts()
      const wallet1 = await randomSigner(DOMAIN)
      const wallet2 = await randomSigner(DOMAIN)
      // register the signers
      {
        const tx = await blsMove
          .connect(user1)
          .registerPublicKey(wallet1.pubkey)
        await tx.wait()
      }
      {
        const tx = await blsMove
          .connect(user2)
          .registerPublicKey(wallet2.pubkey)
        await tx.wait()
      }
      const state = {
        channel: {
          chainId,
          nonce: 0x01,
          participants: [1, 2],
        },
        outcome: [],
        turnNum: 1,
        isFinal: false,
        appData: '0x00',
      }
      {
        const signedState1 = await signState(state, wallet1)
        const signedState2 = await signState(state, wallet2)
        const signature = aggregate([signedState1, signedState2])
        const message = messageToHash(hashState(state), DOMAIN)
        const tx = await blsMove
          .connect(user1)
          .checkpoint(
            getFixedPart(state),
            1,
            [getVariablePart(state)],
            0,
            [0, 0],
            {
              sig: signature,
              pubKeys: [1, 2],
              messages: [message, message],
            }
          )
        await tx.wait()
      }
      const finalState = {
        channel: {
          chainId,
          nonce: 0x01,
          participants: [1, 2],
        },
        outcome: [],
        turnNum: 2 ** 48 - 1,
        isFinal: true,
        appData: '0x00',
      }
      {
        const signedState1 = await signState(finalState, wallet1)
        const signedState2 = await signState(finalState, wallet2)
        const signature = aggregate([signedState1, signedState2])
        const message = messageToHash(hashState(finalState))
        const tx = await blsMove.connect(user1).multiConclude(
          [
            {
              ...getFixedPart(finalState),
              chainId: undefined,
            },
          ],
          hashAppPart(finalState),
          [hashOutcome(finalState.outcome)],
          {
            sig: signature,
            pubKeys: [1, 2],
            messages: [message, message],
          }
        )
        await tx.wait()
      }
    })
  })
})
