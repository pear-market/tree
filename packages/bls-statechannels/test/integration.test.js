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
} = require('../src')
const sha256 = require('js-sha256')
const assert = require('assert')

const DOMAIN = `0x${sha256('test domain')}`

async function getDeployedContracts() {
  const BLSKeyCache = await ethers.getContractFactory('BLSKeyCache')
  const cache = await BLSKeyCache.deploy()
  await cache.deployed()

  const BLSMoveApp = await ethers.getContractFactory('BLSMoveApp')
  const blsMoveApp = await BLSMoveApp.deploy()
  await blsMoveApp.deployed()

  const BLSOpen = await ethers.getContractFactory('BLSOpen')
  const blsOpen = await BLSOpen.deploy()
  await blsOpen.deployed()

  const BLSMove = await ethers.getContractFactory('BLSMove', {
    libraries: {
      BLSOpen: blsOpen.address,
    }
  })
  const blsMove = await BLSMove.deploy(blsMoveApp.address, 100000, DOMAIN)
  await blsMove.deployed()
  return { blsMove, blsOpen, cache }
}

describe('state channels', () => {
  describe('checkpoint conclude', () => {
    it('signs a state and creates a checkpoint then concludes', async () => {
      const [ user ] = await ethers.getSigners()
      const { blsMove, blsOpen } = await getDeployedContracts()
      const wallet = await randomSigner(DOMAIN)
      {
        // register the signer
        const tx = await blsMove.connect(user).registerPublicKey(wallet.pubkey)
        await tx.wait()
      }
      const state = {
        channel: {
          chainId: '0x1', nonce: 0x01, participants: [1]
        },
        outcome: [],
        turnNum: 1,
        isFinal: false,
        appData: '0x00',
      }
      {
        const signedState = await signState(state, wallet)
        const message = messageToHash(hashState(state), DOMAIN)
        const tx = await blsMove.connect(user).checkpoint(
          getFixedPart(state),
          1,
          [getVariablePart(state)],
          0,
          [0],
          {
            sig: signedState,
            pubKeys: [1],
            messages: [message],
          },
        )
        await tx.wait()
      }
      const finalState = {
        channel: {
          chainId: '0x1', nonce: 0x01, participants: [1]
        },
        outcome: [],
        turnNum: 2,
        isFinal: true,
        appData: '0x00',
      }

      {
        const signedState = await signState(finalState, wallet)
        const message = messageToHash(hashState(finalState), DOMAIN)
        const tx = await blsMove.connect(user).conclude(
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

  })
})
