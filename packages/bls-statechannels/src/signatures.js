const { signer, mcl } = require('@thehubbleproject/bls')
const crypto = require('crypto')
const sha256 = require('js-sha256')
const { utils } = require('ethers')

module.exports = {
  randomSigner,
  getChannelId,
  hashState,
  signState,
  getFixedPart,
  getVariablePart,
  messageToHash,
}

async function randomSigner(domain = '') {
  const factory = await signer.BlsSignerFactory.new()
  const domainHex = Buffer.from(sha256(domain), 'hex')
  // secret data
  const rand = await new Promise((rs, rj) => crypto.randomBytes(50, (err, bytes) => err ? rj(err) : rs(bytes)))
  return factory.getSigner(domainHex, `0x${rand.toString('hex')}`)
}

function messageToHash(message, domain = '') {
  const domainHex = Buffer.from(sha256(domain), 'hex')
  const point = mcl.hashToPoint(message, domainHex)
  const hex = mcl.g1ToHex(point)
  return hex
}

async function signState(state, blsSigner) {
  const hashedState = hashState(state)
  const signature = blsSigner.sign(hashedState)
  return signature
}

function getChannelId(channel) {
  const { chainId, participants, nonce } = channel
  const channelId = utils.keccak256(
    utils.defaultAbiCoder.encode(
      ['uint256', 'uint48[]', 'uint256'],
      [chainId, participants, nonce],
    )
  )
  return channelId
}

const outcomeFormat =
  {
    type: 'tuple[]',
    components: [
      { name: 'asset', type: 'address' },
      { name: 'metadata', type: 'bytes' },
      {
        type: 'tuple[]',
        name: 'allocations',
        components: [
          { name: 'destination', type: 'bytes32' },
          { name: 'amount', type: 'uint256' },
          { name: 'allocationType', type: 'uint8' },
          { name: 'metadata', type: 'bytes' },
        ]
      }
    ]
  }

function encodeOutcome(outcome) {
  return utils.defaultAbiCoder.encode(
    [outcomeFormat],
    [outcome]
  )
}

function decodeOutcome(outcome) {
  return utils.defaultAbiCoder.decode(
    [outcomeFormat],
    [outcome]
  )
}

function hashOutcome(outcome) {
  const encoded = encodeOutcome(outcome)
  return utils.keccak256(encoded)
}

function getVariablePart(state) {
  return {
    outcome: encodeOutcome(state.outcome),
    appData: state.appData,
  }
}

function hashAppPart(state) {
  const {appData} = state
  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      ['bytes'],
      [appData]
    )
  )
}

function hashState(state) {
  const { turnNum, isFinal } = state
  const channelId = getChannelId(state.channel)
  const appPartHash = hashAppPart(state)
  const outcomeHash = hashOutcome(state.outcome)

  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      [
        'tuple(uint256 turnNum, bool isFinal, bytes32 channelId, bytes32 appPartHash, bytes32 outcomeHash)',
      ],
      [{turnNum, isFinal, channelId, appPartHash, outcomeHash}]
    )
  )
}

function getFixedPart(state) {
  const { channel } = state
  const { chainId, participants, nonce } = channel
  return { chainId, participants, nonce }
}
