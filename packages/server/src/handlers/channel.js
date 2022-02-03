const { auth, blsAuth } = require('../middleware/auth')
const { ethers } = require('ethers')
const {
  BLSMove,
  BLSMoveABI,
  getChannelId,
  getFixedPart,
  getVariablePart,
  deserializeHexArr,
  serializeHexArr,
  signState,
  verifyStateSig,
} = require('@pearmarket/bls-statechannels')
const crypto = require('crypto')

// db and signer
const vars = {}
module.exports = (app, _vars) => {
  Object.assign(vars, _vars)
  // app.handle('channel.challenge', )
  app.handle('bls.auth.challenge', createChallenge)
  app.handle('bls.auth.respond', respondChallenge)
  app.handle('channel.info', blsAuth(vars.db), channelInfo)
  app.handle('channel.create', blsAuth(vars.db), createChannel)
  app.handle('channel.advance', blsAuth(vars.db), advanceChannel)
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
      isComplete: true,
    }
  })
  send(existingChallenge)
}

async function channelInfo(data, send) {
  const { counterparty } = data
  const latestChannel = await vars.db.findOne('Channel', {
    where: {
      counterparty,
    },
    orderBy: { nonce: 'desc' },
  })
  if (latestChannel?.latestState?.isFinal === false) {
    send(latestChannel)
    return
  }
  send({
    nonce: (latestChannel?.nonce ?? 0)+ 1,
  })
}

// Supply a proof that the user controls the private key they claim in the channel
async function createChannel(data, send) {
  // take a signature from the data and validate it, if the proposed state is
  // acceptable then countersign and return
  const { nonce, counterparty, blsChallenge } = data
  const existingNonce = await vars.db.findOne('Channel', {
    where: {
      counterparty,
      nonce,
    }
  })
  if (existingNonce) {
    throw new Error('Non-unique nonce')
  }
  const initialState = {
    channel: {
      chainId: 0x5, nonce, participants: [vars.keyIndex, counterparty]
    },
    outcome: [
      { asset: '0x0000000000000000000000000000000000000000', metadata: '0x00', allocations: [{
        destination: counterparty,
        amount: 10**15,
        metadata: '0x00',
      }]}
    ],
    turnNum: 0,
    isFinal: false,
    appData: '0x00',
  }
  const channelId = getChannelId(initialState.channel)
  await vars.db.create('Channel', {
    id: channelId,
    nonce,
    chainId: initialState.channel.chainId,
    counterparty,
    latestTurnNum: initialState.turnNum,
    latestState: initialState,
    latestCounterSignature: '',
  })
  // now execute a signature
  const signature = signState(initialState, vars.signer)
  send({
    state: initialState,
    signature,
  })
}

async function advanceChannel(data, send) {
  const { channelId, signature, state, blsChallenge } = data
  const channel = await vars.db.findOne('Channel', {
    where: {
      id: channelId,
    }
  })
  if (!channel) {
    send(`Unable to find channel id: "${channelId}"`, 1)
    return
  }
  if (state.turnNum <= channel.latestTurnNum) {
    send(`Channel turn number not advanced`, 1)
    return
  }
  // verify the bls sig
  const valid = verifyStateSig(state, signature, vars.signer)
  if (!valid) {
    send(`State signature is not valid`, 1)
    return
  }
  await vars.db.update('Channel', {
    where: {
      id: channelId,
    },
    update: {
      latestTurnNum: state.turnNum,
      latestState: state,
      latestCounterSignature: signature,
    }
  })
  // now countersign and return
  send({
    state,
    signature: signState(state, vars.signer)
  })
}
