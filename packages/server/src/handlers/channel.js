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
  hashState,
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
  app.handle('channel.refresh', refreshChannel)
  app.handle('channel.advance', blsAuth(vars.db), advanceChannel)
  app.handle('post.purchase.state', blsAuth(vars.db), purchaseState)
  app.handle('post.purchase', blsAuth(vars.db), purchasePost)
}

// return a hex string of random data of a certain byte length
async function randomHex(length = 32) {
  const bytes = await new Promise((rs, rj) => {
    crypto.randomBytes(length, (err, b) => (err ? rj(err) : rs(b)))
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
    },
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
  if (
    !vars.signer.verify(
      sig,
      pubkey,
      `0x${existingChallenge.challenge.replace('0x', '')}`
    )
  ) {
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
    },
  })
  send(existingChallenge)
}

async function channelInfo(data, send) {
  const { counterparty, blsChallenge } = data
  const latestChannel = await vars.db.findOne('Channel', {
    where: {
      counterparty,
    },
    orderBy: { nonce: 'desc' },
  })
  if (
    latestChannel?.latestState?.isFinal === false &&
    latestChannel.latestCounterSignature
  ) {
    send({
      state: latestChannel.latestState,
      signature: await signState(latestChannel.latestState, vars.signer),
    })
    return
  }
  const nonce = (latestChannel?.nonce ?? 0) + 1
  const existingNonce = await vars.db.findOne('Channel', {
    where: {
      counterparty,
      nonce,
    },
  })
  if (existingNonce) {
    throw new Error('Non-unique nonce')
  }
  const initialState = {
    channel: {
      chainId: 0x5,
      nonce,
      participants: [vars.keyIndex, counterparty],
    },
    outcome: [
      {
        asset: '0x0000000000000000000000000000000000000000',
        metadata: '0x00',
        allocations: [
          {
            destination: counterparty,
            amount: 10 ** 15,
            metadata: '0x00',
          },
          {
            destination: vars.keyIndex,
            amount: 0,
            metadata: '0x00',
          },
        ],
      },
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
  const signature = await signState(initialState, vars.signer)
  send({
    needsInitialSig: true,
    state: initialState,
    signature,
  })
}

async function refreshChannel(data, send) {
  const { channelId, blsChallenge } = data
  const channel = await vars.db.findOne('Channel', {
    where: {
      id: channelId,
    },
  })
  if (!channel) {
    send(`Unable to find channel with id: "${channelId}"`, 1)
    return
  }
  const { allocations } = channel.latestState.outcome[0]
  const expectedBalance = allocations[0].amount + allocations[1].amount
  const balance = await vars.BLSMove.holdings(
    ethers.constants.AddressZero,
    channelId
  )
  if (!balance.eq(expectedBalance)) {
    send(0)
    return
  }
  await vars.db.update('Channel', {
    where: {
      id: channelId,
    },
    update: {
      isFunded: true,
    },
  })
  send(0)
}

// Supply a proof that the user controls the private key they claim in the channel
async function createChannel(data, send) {
  // take a signature from the data and validate it, if the proposed state is
  // acceptable then countersign and return
  const { state, signature, blsChallenge } = data
  const channelId = getChannelId(state.channel)
  const channel = await vars.db.findOne('Channel', {
    where: {
      id: channelId,
    },
  })
  if (!channel) {
    send(`Unable to find channel with id: "${channelId}"`, 1)
    return
  }
  // should provide a countersignature for the latest state
  const knownHash = hashState(channel.latestState)
  const receivedHash = hashState(state)
  if (knownHash !== receivedHash) {
    send('Invalid state provided', 1)
    return
  }
  const valid = verifyStateSig(
    state,
    signature,
    deserializeHexArr(blsChallenge.publicKey),
    vars.signer
  )
  if (!valid) {
    send('Invalid signature', 1)
    return
  }
  await vars.db.update('Channel', {
    where: {
      id: channelId,
    },
    update: {
      latestState: state,
      latestCounterSignature: serializeHexArr(signature),
      // latest turn number should be the same
    },
  })
  send(0)
}

async function purchaseState(data, send) {
  const { channelId, blsChallenge, postId } = data
  const channel = await vars.db.findOne('Channel', {
    where: {
      id: channelId,
    },
  })
  if (!channel) {
    send(`Unable to find channel with id: "${channelId}"`, 1)
    return
  }
  if (channel.latestState?.isFinal === true) {
    send(`Channel has been finalized`, 1)
    return
  }
  const post = await vars.db.findOne('Post', {
    where: {
      id: postId,
    },
  })
  if (!post) {
    send(`Unable to find post with id: "${postId}"`, 1)
    return
  }
  const newState = {
    ...channel.latestState,
    turnNum: channel.latestState.turnNum + 1,
    outcome: [
      {
        asset: ethers.constants.AddressZero,
        metadata: '0x00',
        allocations: [
          {
            destination: channel.counterparty,
            amount:
              +channel.latestState.outcome[0].allocations[0].amount -
              +post.price,
            metadata: '0x00',
          },
          {
            destination: vars.keyIndex,
            amount:
              +channel.latestState.outcome[0].allocations[1].amount +
              +post.price,
            metadata: '0x00',
          },
        ],
      },
    ],
  }
  send(newState)
}

async function purchasePost(data, send) {
  const { signature, state, blsChallenge, postId } = data
  const channelId = getChannelId(state.channel)
  const existingPurchase = await vars.db.findOne('Purchase', {
    where: {
      ownerPublicKey: blsChallenge.publicKey,
      postId,
    },
  })
  if (existingPurchase) {
    send('Post already purchased', 1)
    return
  }
  const post = await vars.db.findOne('Post', {
    where: {
      id: postId,
    },
  })
  if (!post) {
    send(`Unable to find post with id: "${postId}"`, 1)
    return
  }
  const channel = await vars.db.findOne('Channel', {
    where: {
      id: channelId,
    },
  })
  if (!channel) {
    send(`Unable to find channel with id: "${channelId}"`, 1)
    return
  }
  if (!channel.isFunded) {
    send(`Channel is not funded`, 1)
    return
  }
  if (channel.latestState?.isFinal === true) {
    send(`Channel has been finalized`, 1)
    return
  }
  if (state.latestTurnNum <= channel.latestTurnNum) {
    send(`Turn number is not higher than latest known`, 1)
    return
  }
  if (!channel.latestState) {
    send(`Channel has not been initialized`, 1)
    return
  }
  // also check the L1 balance
  if (state.outcome[0].allocations.length !== 2) {
    send('Incorrect number of allocations', 1)
    return
  }
  {
    const lastAmount = channel.latestState.outcome[0].allocations[1].amount
    const newAmount = state.outcome[0].allocations[1].amount
    const paidAmount = +newAmount - +lastAmount
    if (paidAmount !== +post.price) {
      send(`Payment amount not correct`, 1)
      return
    }
  }
  {
    const lastAmount = channel.latestState.outcome[0].allocations[0].amount
    const newAmount = state.outcome[0].allocations[0].amount
    const paidAmount = +lastAmount - +newAmount
    if (paidAmount !== +post.price) {
      send(`Payment amount not correct`, 1)
      return
    }
  }
  if (
    channel.latestState.outcome[0].allocations[0].destination !==
    channel.counterparty
  ) {
    send('Incorrect allocation 0', 1)
    return
  }
  if (
    channel.latestState.outcome[0].allocations[1].destination !== vars.keyIndex
  ) {
    send('Incorrect allocation 1', 1)
    return
  }
  // otherwise verify the state signature
  if (
    !verifyStateSig(
      state,
      signature,
      deserializeHexArr(blsChallenge.publicKey),
      vars.signer
    )
  ) {
    send(1, 'Signature invalid')
    return
  }
  await vars.db.transaction((db) => {
    db.create('Purchase', {
      postId,
      ownerPublicKey: blsChallenge.publicKey,
      channelId,
    })
    db.update('Channel', {
      where: {
        id: channelId,
      },
      update: {
        latestTurnNum: state.turnNum,
        latestState: state,
        latestCounterSignature: serializeHexArr(signature),
      },
    })
  })
  send({
    state,
    signature: await signState(state, vars.signer),
    post: {
      ...post,
      purchased: true,
    },
  })
}

async function advanceChannel(data, send) {
  const { channelId, signature, state, blsChallenge } = data
  const channel = await vars.db.findOne('Channel', {
    where: {
      id: channelId,
    },
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
      latestCounterSignature: serializeHexArr(signature),
    },
  })
  // now countersign and return
  send({
    state,
    signature: await signState(state, vars.signer),
  })
}
