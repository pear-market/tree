pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

interface IBLSMove {

  struct Signature {
    uint sig1;
    uint sig2;
  }

  struct MultiSignature {
    Signature sig;
    uint48[] pubKeys;
    uint[2][] messages;
  }

  struct FixedPart {
    uint chainId;
    // BLS Key ids in the cache
    uint48[] participants;
    uint48 nonce;
    // Use contract level variables for these
    // address appDefinition;
    // uint48 challengeDuration;
  }

  // The minimum needed to calculate the channelId using on chain data
  struct MinFixedPart {
    uint48[] participants;
    uint48 nonce;
    // address appDefinition;
  }

  struct State {
    uint48 turnNum;
    bool isFinal;
    bytes32 channelId;
    bytes32 appPartHash;
    //     keccak256(abi.encode(
    //         fixedPart.challengeDuration,
    //         fixedPart.appDefinition,
    //         variablePart.appData
    //     )
    // )
    bytes32 outcomeHash;
  }

  struct VariablePart {
    bytes outcome;
    bytes appData;
  }

  function challenge(
    MinFixedPart calldata fixedPart,
    uint48 largestTurnNum,
    VariablePart[] calldata variableParts,
    uint8 isFinalCount,
    Signature[] calldata sigs,
    uint8[] calldata whoSignedWhat,
    Signature calldata challengerSig
  ) external;

  function respond(
    bool[2] calldata isFinalAB,
    MinFixedPart calldata fixedPart,
    VariablePart[2] calldata variablePartAB,
    Signature calldata sig
  ) external;

  function checkpoint(
    MinFixedPart calldata fixedPart,
    uint48 largestTurnNum,
    VariablePart[] calldata variableParts,
    uint8 isFinalCount,
    Signature[] calldata sigs,
    uint8[] calldata whoSignedWhat
  ) external;

  function conclude(
    uint48 largestTurnNum,
    FixedPart calldata fixedPart,
    bytes32 appPartHash,
    bytes32 outcomeHash,
    uint8 numStates,
    uint8[] memory whoSignedWhat,
    MultiSignature calldata sigs
  ) external;

  // Conclude many channels where all participants have agreed
  // go through each channel and make sure that its participants are included in the Signature
  function multiConclude(
    uint48 largestTurnNum, // for all channels
    MinFixedPart[] calldata fixedParts,
    bytes32 appPartHash, // the app data hash should be the same
    bytes32[] calldata outcomeHash,
    uint8 numStates, // for all channels
    uint8[] calldata whoSignedWhat, // for all
    Signature calldata sigs // supply a single sig for all
  ) external;
}
