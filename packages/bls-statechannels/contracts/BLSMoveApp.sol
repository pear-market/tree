pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import { IBLSMoveApp } from "./interfaces/IBLSMoveApp.sol";
import { IBLSMove } from "./interfaces/IBLSMove.sol";

contract BLSMoveApp is IBLSMoveApp {
  function validTransition(
    IBLSMove.VariablePart calldata a,
    IBLSMove.VariablePart calldata b,
    uint48 turnNumB,
    uint256 nParticipants
  ) external override pure returns (bool) {
    return false;
  }
}
