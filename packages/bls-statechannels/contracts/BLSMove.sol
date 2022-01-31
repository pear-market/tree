pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import { IBLSMove } from "./interfaces/IBLSMove.sol";
import { IBLSMoveApp } from "./interfaces/IBLSMoveApp.sol";
import "./BLSKeyCache.sol";
import "./StatusManager.sol";
import { BLSOpen } from "./BLS.sol";

contract StateChannel is BLSKeyCache, StatusManager {

  address immutable appDefinition;
  uint48 immutable challengeDuration;

  constructor(address _appDefintion, uint48 _challengeDuration) {
    appDefinition = _appDefintion;
    challengeDuration = _challengeDuration;
  }

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
    uint8[] calldata whoSignedWhat,
    IBLSMove.MultiSignature calldata sigs
  ) external {
    _checkpoint(
      fixedPart,
      largestTurnNum,
      variableParts,
      isFinalCount,
      whoSignedWhat,
      sigs
    );
  }

  function _checkpoint(
    IBLSMove.MinFixedPart calldata fixedPart,
    uint48 largestTurnNum,
    IBLSMove.VariablePart[] calldata variableParts,
    uint8 isFinalCount,
    uint8[] calldata whoSignedWhat,
    IBLSMove.MultiSignature calldata sigs
  ) internal {
    requireValidInput(
      fixedPart.participants.length,
      variableParts.length,
      sigs.messages.length
    );
    bytes32 channelId = _getChannelId(fixedPart.participants, fixedPart.nonce);
    _requireChannelNotFinalized(channelId);
    _requireIncreasedTurnNumber(channelId, largestTurnNum);
  }


  // In a multiConclude function we will assume that whoSignedWhat is [0, 0]
  // e.g. all participants sign one state, and only one state is provided
  // Conclude many channels where all participants have agreed
  // go through each channel and make sure that its participants are included in the IBLSMove.Signature
  // the appPartHash should be common for all channels. Applications should explicitly nullify this value
  // the largestTurnNum should be the same for all channels, something like type(uint48).max
  function multiConclude(
    IBLSMove.MinFixedPart[] calldata fixedParts,
    bytes32 appPartHash, // the app data hash should be the same
    bytes32[] calldata outcomeHash,
    IBLSMove.Signature calldata sigs // supply a single sig for all
  ) external {
    _multiConclude(
      fixedParts,
      appPartHash,
      outcomeHash,
      sigs
    );
  }

  function _multiConclude(
    IBLSMove.MinFixedPart[] calldata fixedParts,
    bytes32 appPartHash, // the app data hash should be the same
    bytes32[] calldata outcomeHash,
    IBLSMove.Signature calldata sigs // supply a single sig for all
  ) internal {
    // TODO
  }

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

  function _requireStateSupportedBy(
    uint48 largestTurnNum,
    IBLSMove.VariablePart[] memory variableParts,
    uint8 isFinalCount,
    bytes32 channelId,
    IBLSMove.FixedPart memory fixedPart,
    IBLSMove.MultiSignature memory sigs,
    uint8[] memory whoSignedWhat
  ) internal view returns (bytes32) {
    bytes32[] memory stateHashes = _requireValidTransitionChain(
      largestTurnNum,
      variableParts,
      isFinalCount,
      channelId,
      fixedPart
    );
    require(
      _validSignatures(
        largestTurnNum,
        fixedPart.participants,
        stateHashes,
        sigs,
        whoSignedWhat
      ),
      'Invalid signature'
    );
    return stateHashes[stateHashes.length - 1];
  }

  function _requireValidTransitionChain(
    uint48 largestTurnNum,
    IBLSMove.VariablePart[] memory variableParts,
    uint8 isFinalCount,
    bytes32 channelId,
    IBLSMove.FixedPart memory fixedPart
  ) internal view returns (bytes32[] memory) {
    bytes32[] memory stateHashes = new bytes32[](variableParts.length);
    uint48 firstFinalTurnNum = largestTurnNum - isFinalCount + 1;
    uint48 turnNum;

    for (uint48 i = 0; i < variableParts.length; i++) {
      turnNum = largestTurnNum - uint48(variableParts.length) + 1 + i;
      stateHashes[i] = _hashState(
        turnNum,
        turnNum >= firstFinalTurnNum,
        channelId,
        variableParts[i].appData,
        keccak256(variableParts[i].outcome)
      );
      if (turnNum < largestTurnNum) {
        // _requireValidTransition
        _requireValidTransition(
          fixedPart.participants.length,
          [turnNum >= firstFinalTurnNum, turnNum + 1 >= firstFinalTurnNum],
          [variableParts[i], variableParts[i+1]],
          turnNum + 1
        );
      }
    }
    return stateHashes;
  }

  function _requireValidTransition(
    uint nParticipants,
    bool[2] memory isFinalAB,
    IBLSMove.VariablePart[2] memory ab,
    uint48 turnNumB
  ) internal view returns (bool) {
    IsValidTransition isValidProtocolTransition = _requireValidProtocolTransition(
      nParticipants,
      isFinalAB, // [a.isFinal, b.isFinal]
      ab, // [a,b]
      turnNumB
    );

    if (isValidProtocolTransition == IsValidTransition.NeedToCheckApp) {
      require(
        IBLSMoveApp(appDefinition).validTransition(ab[0], ab[1], turnNumB, nParticipants),
        'Invalid ForceMoveApp Transition'
      );
    }
    return true;
  }

  enum IsValidTransition {True, NeedToCheckApp}

  /**
  * @notice Check that the submitted pair of states form a valid transition
  * @dev Check that the submitted pair of states form a valid transition
  * @param nParticipants Number of participants in the channel.
  transition
  * @param isFinalAB Pair of booleans denoting whether the first and second state (resp.) are final.
  * @param ab Variable parts of each of the pair of states
  * @param turnNumB turnNum of the later state of the pair
  * @return true if the later state is a validTransition from its predecessor, false otherwise.
  */
  function _requireValidProtocolTransition(
    uint256 nParticipants,
    bool[2] memory isFinalAB, // [a.isFinal, b.isFinal]
    IBLSMove.VariablePart[2] memory ab, // [a,b]
    uint48 turnNumB
  ) internal pure returns (IsValidTransition) {
    // a separate check on the signatures for the submitted states implies that the following fields are equal for a and b:
    // chainId, participants, channelNonce, appDefinition, challengeDuration
    // and that the b.turnNum = a.turnNum + 1
    if (isFinalAB[1]) {
      require(_bytesEqual(ab[1].outcome, ab[0].outcome), 'Outcome change verboten');
    } else {
      require(!isFinalAB[0], 'isFinal retrograde');
      if (turnNumB < 2 * nParticipants) {
        require(_bytesEqual(ab[1].outcome, ab[0].outcome), 'Outcome change forbidden');
        require(_bytesEqual(ab[1].appData, ab[0].appData), 'appData change forbidden');
      } else {
        return IsValidTransition.NeedToCheckApp;
      }
    }
    return IsValidTransition.True;
  }

  function _requireIncreasedTurnNumber(bytes32 channelId, uint48 newTurnNum) internal view {
    (uint48 turnNum, , ) = _unpackStatus(channelId);
    require(newTurnNum > turnNum, 'turnNum not increased');
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
      // offset is the difference between the index of participant[i] and the index of the participant who owns the largestTurnNum state
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

  /**
   * @notice Computes the hash of the state corresponding to the input data.
   * @dev Computes the hash of the state corresponding to the input data.
   * @param turnNum Turn number
   * @param isFinal Is the state final?
   * @param channelId Unique identifier for the channel
   * @param appData Application specific date
   * @param outcomeHash Hash of the outcome.
   * @return The stateHash
   */
  function _hashState(
    uint48 turnNum,
    bool isFinal,
    bytes32 channelId,
    bytes memory appData,
    bytes32 outcomeHash
  ) internal view returns (bytes32) {
    return keccak256(
      abi.encode(
        IBLSMove.State(
          turnNum,
          isFinal,
          channelId,
          keccak256(
            abi.encode(
              challengeDuration,
              appDefinition,
              appData
            )
          ),
          outcomeHash
        )
      )
    );
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

  /**
   * @notice Check for equality of two byte strings
   * @dev Check for equality of two byte strings
   * @param _preBytes One bytes string
   * @param _postBytes The other bytes string
   * @return true if the bytes are identical, false otherwise.
   */
  function _bytesEqual(bytes memory _preBytes, bytes memory _postBytes) internal pure returns (bool) {
    // copied from https://www.npmjs.com/package/solidity-bytes-utils/v/0.1.1
    bool success = true;

    /* solhint-disable no-inline-assembly */
    assembly {
      let length := mload(_preBytes)

      // if lengths don't match the arrays are not equal
      switch eq(length, mload(_postBytes))
        case 1 {
          // cb is a circuit breaker in the for loop since there's
          //  no said feature for inline assembly loops
          // cb = 1 - don't breaker
          // cb = 0 - break
          let cb := 1

          let mc := add(_preBytes, 0x20)
          let end := add(mc, length)

          for {
            let cc := add(_postBytes, 0x20)
            // the next line is the loop condition:
            // while(uint256(mc < end) + cb == 2)
          } eq(add(lt(mc, end), cb), 2) {
            mc := add(mc, 0x20)
            cc := add(cc, 0x20)
          } {
            // if any of these checks fails then arrays are not equal
            if iszero(eq(mload(mc), mload(cc))) {
              // unsuccess:
              success := 0
              cb := 0
            }
          }
        }
        default {
          // unsuccess:
          success := 0
        }
    }
    /* solhint-disable no-inline-assembly */

    return success;
  }
}
