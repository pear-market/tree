pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

interface IBLSMove {

  struct Signature {
    uint sig1;
    uint sig2;
  }

  struct MultiSignature {
    uint[2] sig;
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
    FixedPart calldata fixedPart,
    uint48 largestTurnNum,
    VariablePart[] calldata variableParts,
    uint8 isFinalCount,
    uint8[] calldata whoSignedWhat,
    MultiSignature calldata sigs
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
    IBLSMove.MinFixedPart[] memory fixedParts,
    bytes32[] calldata outcomeHash,
    uint[2] calldata signature
  ) external;

  /**
   * @dev Indicates that a challenge has been registered against `channelId`.
   * @param channelId Unique identifier for a state channel.
   * @param turnNumRecord A turnNum that (the adjudicator knows) is supported by a signature from each participant.
   * @param finalizesAt The unix timestamp when `channelId` will finalize.
   * @param isFinal Boolean denoting whether the challenge state is final.
   * @param fixedPart Data describing properties of the state channel that do not change with state updates.
   * @param variableParts An ordered array of structs, each decribing the properties of the state channel that may change with each state update.
   * @param sigs A list of Signatures that supported the challenge: one for each participant, in participant order (e.g. [sig of participant[0], sig of participant[1], ...]).
   * @param whoSignedWhat Indexing information to identify which signature was by which participant
   */
  event ChallengeRegistered(
    bytes32 indexed channelId,
    uint48 turnNumRecord,
    uint48 finalizesAt,
    bool isFinal,
    FixedPart fixedPart,
    VariablePart[] variableParts,
    Signature[] sigs,
    uint8[] whoSignedWhat
  );

  /**
   * @dev Indicates that a challenge, previously registered against `channelId`, has been cleared.
   * @param channelId Unique identifier for a state channel.
   * @param newTurnNumRecord A turnNum that (the adjudicator knows) is supported by a signature from each participant.
   */
  event ChallengeCleared(bytes32 indexed channelId, uint48 newTurnNumRecord);

  /**
   * @dev Indicates that a challenge has been registered against `channelId`.
   * @param channelId Unique identifier for a state channel.
   * @param finalizesAt The unix timestamp when `channelId` finalized.
   */
  event Concluded(bytes32 indexed channelId, uint48 finalizesAt);
}
