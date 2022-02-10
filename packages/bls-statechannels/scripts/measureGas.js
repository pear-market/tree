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

async function multiConclude(channelCount = 5) {
  const { chainId } = await ethers.provider.getNetwork()
  const [user1] = await ethers.getSigners()
  const { blsMove } = await getDeployedContracts()
  const wallet1 = await randomSigner(DOMAIN)
  {
    const tx = await blsMove.connect(user1).registerPublicKey(wallet1.pubkey)
    await tx.wait()
  }
  const participant1 = 1
  const signatures = []
  const messages = []
  const fixedParts = []
  const outcomeHashes = []
  const pubkeys = []
  let appHash
  for (let x = 0; x < channelCount; x++) {
    const wallet2 = await randomSigner(DOMAIN)
    // register the signers
    const tx = await blsMove.connect(user1).registerPublicKey(wallet2.pubkey)
    await tx.wait()
    const participant2 = await blsMove.connect(user1).indexByKey(wallet2.pubkey)
    console.log(participant2)
    const finalState = {
      channel: {
        chainId,
        nonce: 0x01,
        participants: [1, participant2],
      },
      outcome: [],
      turnNum: 2 ** 48 - 1,
      isFinal: true,
      appData: '0x00',
    }
    {
      const signedState1 = await signState(finalState, wallet1)
      const signedState2 = await signState(finalState, wallet2)
      const message = messageToHash(hashState(finalState))
      signatures.push(signedState1, signedState2)
      messages.push(message, message)
      fixedParts.push({
        ...getFixedPart(finalState),
        participants: [participant2],
        chainId: undefined,
      })
      outcomeHashes.push(hashOutcome(finalState.outcome))
      pubkeys.push(1, participant2)
      appHash = hashAppPart(finalState)
    }
  }
  {
    const signature = aggregate(signatures)
    const tx = await blsMove
      .connect(user1)
      .multiConcludeSingleParty(1, fixedParts, outcomeHashes, signature)
    await tx.wait()
  }
}

async function main() {
  await multiConclude()
}

main().catch((err) => console.log(err) || process.exit(1))
