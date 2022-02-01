const { signer, mcl } = require('@thehubbleproject/bls')
const crypto = require('crypto')
const sha256 = require('js-sha256')
const { utils } = require('ethers')
const { DOMAIN } = require('./domain')
// TODO: optionally load this if in a web env
const { Buffer } = require('buffer/')

module.exports = {
  BLSMoveAddress: require('./address').BLSMove,
  BLSMoveABI: require('./abi/BLSMove.json'),
  BLSKeyCacheABI: require('./abi/BLSKeyCache.json'),
  DOMAIN,
  randomSigner,
  getChannelId,
  hashState,
  signState,
  getFixedPart,
  getVariablePart,
  messageToHash,
  hashAppPart,
  hashOutcome,
  signerFromSecret,
  serializeHexArr,
  deserializeHexArr,
}

function serializeHexArr(hexArr) {
  // array of two hex values
  return hexArr.join('-')
}

function deserializeHexArr(hexStr) {
  return hexStr.split('-')
}

function serializePublicKey(pubkey) {
  // array of four hex values

}

// return a raw hex string, no 0x prefix
function parseDomain(domain) {
  if (domain.indexOf('0x') === 0 && domain.length === 66) {
    return domain.replace('0x', '')
  } else if (domain.length === 64 && /^[0-9a-fA-F]+$/.test(domain)) {
    return domain
  } else {
    return sha256(domain)
  }
}

// secret should be a hex string
async function signerFromSecret(secret, domain = DOMAIN) {
  const factory = await signer.BlsSignerFactory.new()
  const domainHex = Buffer.from(parseDomain(domain), 'hex')
  // secret data
  return factory.getSigner(domainHex, `0x${secret.replace('0x', '')}`)
}

async function randomSigner(domain = DOMAIN) {
  const factory = await signer.BlsSignerFactory.new()
  const domainHex = Buffer.from(parseDomain(domain), 'hex')
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
