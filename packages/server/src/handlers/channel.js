const { auth } = require('../middleware/auth')
const { ethers } = require('ethers')
const {
  BLSMove,
  BLSMoveABI,
  getChannelId,
  getFixedPart,
  getVariablePart,
  deserializeHexArr,
  serializeHexArr,
} = require('@pearmarket/bls-statechannels')
const crypto = require('crypto')

// db and signer
const vars = {}
module.exports = (app, _vars) => {
  Object.assign(vars, _vars)
  // app.handle('channel.challenge', )
  app.handle('bls.auth.challenge', createChallenge)
  app.handle('bls.auth.respond', respondChallenge)
  app.handle('channel.create', createChannel)
}

// return a hex string of random data of a certain byte length
async function randomHex(length = 32) {
  const bytes = await new Promise((rs, rj) => {
    crypto.randomBytes(length, (err, b) => err ? rj(err) : rs(b))
  })
  return Buffer.from(bytes).toString('hex')
}

async function createChallenge(data, send) {
  const challengeStr = await randomHex()
  const challenge = await vars.db.create('BLSChallenge', {
    challenge: challengeStr,
  })
  send(challenge)
}

async function respondChallenge(data, send) {
  const { challenge, responseSig, publicKey } = data
  const existingChallenge = await vars.db.findOne('BLSChallenge', {
    where: {
      challenge,
    }
  })
  if (!existingChallenge) {
    send(1, 'Unable to find challenge')
    return
  }
  if (+new Date() > +existingChallenge.expiresAt) {
    send(1, 'Challenge has expired')
    return
  }
  if (existingChallenge.responseSig) {
    send(1, 'Challenge already completed')
    return
  }
  // verify the BLS sig
  const sig = deserializeHexArr(responseSig)
  const pubkey = deserializeHexArr(publicKey)
  if (!vars.signer.verify(sig, pubkey, `0x${existingChallenge.challenge.replace('0x', '')}`)) {
    send(1, 'Signature invalid')
    return
  }
  await vars.db.update('BLSChallenge', {
    where: {
      challenge,
    },
    update: {
      responseSig,
      publicKey,
    }
  })
  send(existingChallenge)
}

// Supply a proof that the user controls the private key they claim in the channel
async function createChannel(data, send) {
  // take a signature from the data and validate it, if the proposed state is
  // acceptable then countersign and return
  const { state, signature, counterparty } = data
  const existingNonce = await vars.db.findOne('Channel', {
    nonce: state.nonce,
  })
  if (existingNonce) {
    throw new Error('Non-unique nonce')
  }
  const channelId = getChannelId(state)
  await vars.db.create('Channel', {
    id: channelId,
    nonce: state.nonce,
    chainId: state.chainId,
    counterparty: 0,
    latestTurnNum: state.turnNum,
    latestState: state,
    latestCounterSignature: signature,
  })
}
