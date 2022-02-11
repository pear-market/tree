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
const BN = require('bn.js')
const { BigNumber } = ethers

const CONFIG = {
  withdraw: true,
  compress: true,
}
// 10 withdrawals: https://kovan-optimistic.etherscan.io/tx/0xfb98203db11f873534c4de94de8271a4a1ef2ce614468abfb44f0680592e6edb
// 10 withdrawals with compression: https://kovan-optimistic.etherscan.io/tx/0x106e0fe75e8a9f77355a430bc3461a0665663cadcf00db2371643e029f6ecb7c
// 20 withdrawals with compression: https://kovan-optimistic.etherscan.io/tx/0x613e6f76646caa68bfdad7c905ae78bad24ac8d2c89c4635f7f501d32724ae5f

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

  const Decompressor = await ethers.getContractFactory('Decompressor')
  const decompressor = await Decompressor.deploy(blsMove.address)
  await decompressor.deployed()

  return { blsMove, blsOpen, cache, decompressor }
}

function convertAddressToBytes32(address) {
  const normalizedAddress = BigNumber.from(address).toHexString()
  if (!ethers.utils.isAddress(normalizedAddress)) {
    throw new Error('Invalid address')
  }
  return ethers.utils.hexZeroPad(normalizedAddress, 32)
}

async function main(channelCount = 20) {
  const { chainId } = await ethers.provider.getNetwork()
  const [user1] = await ethers.getSigners()
  const { blsMove, decompressor } = await getDeployedContracts()
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
      if (CONFIG.compress) {
        const tx = await decompressor
          .connect(user1)
          .decompressSimpleCall(
            ...compress(1, fixedParts, outcomes.map(encodeOutcome), signature)
          )
        await tx.wait()
      } else {
        const tx = await blsMove
          .connect(user1)
          .multiConcludeWithdrawSingleParty(
            1,
            fixedParts,
            outcomes.map(encodeOutcome),
            signature
          )
        await tx.wait()
      }
    } else {
      const tx = await blsMove
        .connect(user1)
        .multiConcludeSingleParty(1, fixedParts, outcomeHashes, signature)
      await tx.wait()
    }
  }
}

function compress(counterparty, fixedParts, outcomeBytes, signature) {
  const functionFormat = {
    type: 'tuple',
    components: [
      { name: 'counterparty', type: 'uint48' },
      {
        type: 'tuple[]',
        name: 'fixedParts',
        components: [
          { name: 'participants', type: 'uint48[]' },
          { name: 'nonce', type: 'uint48' },
        ],
      },
      { name: 'outcomeBytes', type: 'bytes[]' },
      { name: 'signature', type: 'uint[2]' },
    ],
  }
  const compressFormat = 'tuple(uint48 method, bytes data)'
  const functionData = ethers.utils.defaultAbiCoder.encode(
    [functionFormat],
    [{ counterparty, fixedParts, outcomeBytes, signature }]
  )
  const calldata = ethers.utils.defaultAbiCoder.encode(
    [compressFormat],
    [{ method: 0, data: functionData }]
  )
  // console.log(calldata)
  // now compress it so it's compatible
  const rawData = calldata.replace('0x', '')
  // console.log(rawData)
  const compressedBits = []
  const uniqueBytes = []
  for (let x = 0; x < rawData.length / 2; x++) {
    const byte = rawData.slice(x * 2, x * 2 + 2)
    if (byte === '00') {
      compressedBits.push('0')
    } else {
      compressedBits.push('1')
      uniqueBytes.push(byte)
    }
  }
  // now convert the binary to hex and abi encode the unique bytes
  const reverse = (str) => str.split('').reverse().join('')
  const bytes = []
  const _compressedBits = compressedBits.join('')
  for (let x = 0; x < _compressedBits.length / 8; x++) {
    const byte = new BN(
      reverse(_compressedBits.slice(x * 8, x * 8 + 8)),
      2
    ).toString(16)
    bytes.push(byte.length === 1 ? `0${byte}` : byte)
  }
  const data = '0x' + bytes.join('')
  const uniqueData = '0x' + uniqueBytes.join('')
  return [data, uniqueData]
}

main().catch((err) => console.log(err) || process.exit(1))
