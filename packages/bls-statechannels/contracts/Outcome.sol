pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

library OutcomeFormat {
  struct Outcome {
    address asset;
    bytes metadata;
    Allocation[] allocations;
  }

  struct Allocation {
    bytes32 destination;
    uint amount;
    bytes metadata;
  }

  function encodeOutcome(Outcome[] memory outcome) internal pure returns (bytes memory) {
    return abi.encode(outcome);
  }

  function decodeOutcome(bytes memory outcome) internal pure returns (Outcome[] memory) {
    return abi.decode(outcome, (Outcome[]));
  }

  function encodeAllocation(Allocation memory allocation) internal pure returns (bytes memory) {
    return abi.encode(allocation);
  }

  function decodeAllocation(bytes memory allocation) internal pure returns (Allocation memory) {
    return abi.decode(allocation, (Allocation));
  }

}
