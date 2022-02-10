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
  encodeOutcome,
} = require('../src')
const { BigNumber } = ethers

const CONFIG = {
  withdraw: false,
}
// 10 withdrawals: https://kovan-optimistic.etherscan.io/tx/0xfb98203db11f873534c4de94de8271a4a1ef2ce614468abfb44f0680592e6edb

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

  const BLSMove = await ethers.getContractFactory('Adjudicator', {
    libraries: {
      BLSOpen: blsOpen.address,
    },
  })
  const blsMove = await BLSMove.deploy(blsMoveApp.address, 100000, DOMAIN)
  await blsMove.deployed()

  return { blsMove, blsOpen, cache }
}

function convertAddressToBytes32(address) {
  const normalizedAddress = BigNumber.from(address).toHexString()
  if (!ethers.utils.isAddress(normalizedAddress)) {
    throw new Error('Invalid address')
  }
  return ethers.utils.hexZeroPad(normalizedAddress, 32)
}

async function main(channelCount = 5) {
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
  const outcomes = []
  const pubkeys = []
  let appHash
  for (let x = 0; x < channelCount; x++) {
    const wallet2 = await randomSigner(DOMAIN)
    // register the signers
    {
      const tx = await blsMove.connect(user1).registerPublicKey(wallet2.pubkey)
      await tx.wait()
    }
    const participant2 = await blsMove.connect(user1).indexByKey(wallet2.pubkey)
    console.log(participant2)
    const amount = Math.ceil(Math.random() * 10000)
    const finalState = {
      channel: {
        chainId,
        nonce: 0x01,
        participants: [1, participant2],
      },
      outcome: [
        {
          asset: ethers.constants.AddressZero,
          metadata: '0x00',
          allocations: [
            {
              destination: convertAddressToBytes32(user1.address),
              amount,
              metadata: '0x00',
            },
          ],
        },
      ],
      turnNum: 2 ** 48 - 1,
      isFinal: true,
      appData: '0x00',
    }
    if (CONFIG.withdraw) {
      // execute the deposit transaction
      const tx = await blsMove
        .connect(user1)
        .deposit(
          ethers.constants.AddressZero,
          getChannelId(finalState.channel),
          0,
          amount,
          {
            value: amount,
          }
        )
      await tx.wait()
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
      outcomes.push(finalState.outcome)
      pubkeys.push(1, participant2)
      appHash = hashAppPart(finalState)
    }
  }
  {
    const signature = aggregate(signatures)
    if (CONFIG.withdraw) {
      const tx = await blsMove
        .connect(user1)
        .multiConcludeWithdrawSingleParty(
          1,
          fixedParts,
          outcomes.map(encodeOutcome),
          signature
        )
      await tx.wait()
    } else {
      const tx = await blsMove
        .connect(user1)
        .multiConcludeSingleParty(1, fixedParts, outcomeHashes, signature)
      await tx.wait()
    }
  }
}

main().catch((err) => console.log(err) || process.exit(1))
