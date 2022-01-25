pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "@statechannels/nitro-protocol/contracts/NitroAdjudicator.sol";
import { BLS } from "./hubble-contracts/libs/BLS.sol";

contract BLSForceMove is NitroAdjudicator {
  //
  // struct FinalState {
  //   FixedPart memory fixedPart
  //   uint48 largestTurnNum
  //   bytes32 appPartHash
  //   bytes32 outcomeHash
  //   uint8 numStates
  //   uint8 isFinalCount
  //   Signature[] memory signature
  // }
  //
  // function multiConclude(
  //   FinalState[] memory states
  // ) public {
  //   // unroll the bls signatures and then internally call conclude for each
  //
  // }

}
