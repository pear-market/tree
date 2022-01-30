pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import { IBLSMove } from "./interfaces/IBLSMove.sol";
import "./BLSKeyCache.sol";
import "./StatusManager.sol";
import { BLSOpen } from "./BLS.sol";

contract StateChannel is BLSKeyCache, StatusManager {

  function challenge(
    IBLSMove.MinFixedPart calldata fixedPart,
    uint48 largestTurnNum,
    IBLSMove.VariablePart[] calldata variableParts,
    uint8 isFinalCount,
    IBLSMove.Signature[] calldata sigs,
    uint8[] calldata whoSignedWhat,
    IBLSMove.Signature calldata challengerSig
  ) external {}

  function respond(
    bool[2] calldata isFinalAB,
    IBLSMove.MinFixedPart calldata fixedPart,
    IBLSMove.VariablePart[2] calldata variablePartAB,
    IBLSMove.Signature calldata sig
  ) external {}

  function checkpoint(
    IBLSMove.MinFixedPart calldata fixedPart,
    uint48 largestTurnNum,
    IBLSMove.VariablePart[] calldata variableParts,
    uint8 isFinalCount,
    IBLSMove.Signature[] calldata sigs,
    uint8[] calldata whoSignedWhat
  ) external {}

  // Conclude many channels where all participants have agreed
  // go through each channel and make sure that its participants are included in the IBLSMove.Signature
  function multiConclude(
    uint48 largestTurnNum, // for all channels
    IBLSMove.MinFixedPart[] calldata fixedParts,
    bytes32 appPartHash, // the app data hash should be the same
    bytes32[] calldata outcomeHash,
    uint8 numStates, // for all channels
    uint8[] calldata whoSignedWhat, // for all
    IBLSMove.Signature calldata sigs // supply a single sig for all
  ) external {}

  // In a multiConclude function we will assume that whoSignedWhat is [0, 0]
  // e.g. all participants sign one state, and only one state is provided

  function conclude(
    uint48 largestTurnNum,
    IBLSMove.FixedPart calldata fixedPart,
    bytes32 appPartHash,
    bytes32 outcomeHash,
    uint8 numStates,
    uint8[] memory whoSignedWhat,
    IBLSMove.MultiSignature calldata sigs
  ) external {
    _conclude(
      largestTurnNum,
      fixedPart,
      appPartHash,
      outcomeHash,
      numStates,
      whoSignedWhat,
      sigs
    );
  }

  function _conclude(
    uint48 largestTurnNum,
    IBLSMove.FixedPart calldata fixedPart,
    bytes32 appPartHash,
    bytes32 outcomeHash,
    uint8 numStates,
    uint8[] memory whoSignedWhat,
    IBLSMove.MultiSignature calldata sigs
  ) internal {
    bytes32 channelId = _getChannelId(fixedPart.participants, fixedPart.nonce);
    _requireChannelNotFinalized(channelId);

    requireValidInput(
      fixedPart.participants.length,
      numStates,
      sigs.messages.length
    );

    require(largestTurnNum + 1 >= numStates, 'largestTurnNum too low');

    bytes32[] memory stateHashes = new bytes32[](numStates);
    for (uint48 i = 0; i < numStates; i++) {
      stateHashes[i] = keccak256(
        abi.encode(
          IBLSMove.State(
            largestTurnNum + (i+1) - numStates,
            true, // is final
            channelId,
            appPartHash,
            outcomeHash
          )
        )
      );
    }

    require(
      _validSignatures(
        largestTurnNum,
        fixedPart.participants,
        stateHashes,
        sigs,
        whoSignedWhat
      ),
      'Invalid signatures / !isFinal'
    );

    statusOf[channelId] = _generateStatus(
      ChannelData(0, uint48(block.timestamp), bytes32(0), outcomeHash)
    );
    // emit Concluded(channelId, uint48(block.timestamp));
  }

  function _requireChannelNotFinalized(bytes32 channelId) public view {
    require(_mode(channelId) != ChannelMode.Finalized, 'Channel finalized.');
  }

  // Expect that each participant signed the latest state
  function _validSignatures(
    uint48 largestTurnNum,
    uint48[] memory participants,
    bytes32[] memory stateHashes,
    IBLSMove.MultiSignature memory sigs,
    uint8[] memory whoSignedWhat
  ) internal view returns (bool) {
    uint nParticipants = participants.length;
    uint nStates = stateHashes.length;

    // Make sure the who signed what is structured correctly
    require(_acceptableWhoSignedWhat(
      whoSignedWhat,
      largestTurnNum,
      nParticipants,
      nStates
    ), 'Invalid whoSignedWhat array');
    require(sigs.pubKeys.length == whoSignedWhat.length);

    // require that the public keys are ordered as expected in the multisig
    // also verify that we have non-zero keys for each
    uint[4][] memory pubkeys = new uint[4][](sigs.pubKeys.length);
    for (uint i = 0; i < nParticipants; i++) {
      require(participants[i] == sigs.pubKeys[i]);
      uint[4] memory pubkey = publicKeys[sigs.pubKeys[i]];
      require(
        pubkey[0] != 0 &&
        pubkey[1] != 0 &&
        pubkey[2] != 0 &&
        pubkey[3] != 0,
        "pubkey not found"
      );
      pubkeys[i] = pubkey;
    }
    // make sure the message for each sig is the state hash we expect based on
    // the whoSignedWhat array
    for (uint8 i = 0; i < whoSignedWhat.length; i++) {
      uint[2] memory message = BLSOpen.hashToPoint(
        bytes32(0), // TODO: set domain
        abi.encodePacked(stateHashes[whoSignedWhat[i]])
      );
      require(
        message[0] == sigs.messages[i][0] &&
        message[1] == sigs.messages[i][1],
        'Message mismatch'
      );
    }
    // verify BLS multisig
    uint[2] memory sigArr;
    sigArr[0] = sigs.sig.sig1;
    sigArr[1] = sigs.sig.sig2;
    return BLSOpen.verifyMultiple(
      sigArr,
      pubkeys,
      sigs.messages
    );
  }

  function _acceptableWhoSignedWhat(
    uint8[] memory whoSignedWhat,
    uint48 largestTurnNum,
    uint nParticipants,
    uint nStates
  ) internal pure returns (bool) {
    require(whoSignedWhat.length == nParticipants, '|whoSignedWhat|!=nParticipants');
    for (uint256 i = 0; i < nParticipants; i++) {
      uint256 offset = (nParticipants + largestTurnNum - i) % nParticipants;
      // offset is the difference between the index of participant[i] and the index of the participant who owns the largesTurnNum state
      // the additional nParticipants in the dividend ensures offset always positive
      if (whoSignedWhat[i] + offset + 1 < nStates) {
        return false;
      }
    }
    return true;
  }

  function requireValidInput(
    uint numParticipants,
    uint numStates,
    uint numSigs
  ) public view returns (bool) {
      require((numParticipants >= numStates) && (numStates > 0), 'Insufficient or excess states');
      require(
        (numSigs == numParticipants), // && (numWhoSignedWhats == numParticipants),
        'Bad |signatures|v|whoSignedWhat|'
      );
      require(numParticipants <= type(uint8).max, 'Too many participants!'); // type(uint8).max = 2**8 - 1 = 255
      // no more than 255 participants
      // max index for participants is 254
      return true;
  }

  function getChainID() public pure returns (uint256) {
    uint256 id;
    /* solhint-disable no-inline-assembly */
    assembly {
      id := chainid()
    }
    /* solhint-disable no-inline-assembly */
    return id;
  }

  function _getChannelId(IBLSMove.FixedPart memory fixedPart) public pure returns (bytes32) {
    require(getChainID() == fixedPart.chainId, 'Incorrect chainId');
    return _getChannelId(fixedPart.participants, fixedPart.nonce);
  }

  function _getChannelId(uint48[] memory participants, uint48 nonce) public pure returns (bytes32) {
    return keccak256(
      abi.encode(getChainID(), participants, nonce)
    );
  }

}
