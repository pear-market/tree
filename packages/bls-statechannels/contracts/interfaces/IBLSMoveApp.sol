// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import { IBLSMove } from "./IBLSMove.sol";

/**
 * @dev The IForceMoveApp interface calls for its children to implement an application-specific validTransition function, defining the state machine of a ForceMove state channel DApp.
 */
interface IBLSMoveApp {
  /**
   * @notice Encodes application-specific rules for a particular ForceMove-compliant state channel.
   * @dev Encodes application-specific rules for a particular ForceMove-compliant state channel.
   * @param a State being transitioned from.
   * @param b State being transitioned to.
   * @param turnNumB Turn number being transitioned to.
   * @param nParticipants Number of participants in this state channel.
   * @return true if the transition conforms to this application's rules, false otherwise
   */
  function validTransition(
    IBLSMove.VariablePart calldata a,
    IBLSMove.VariablePart calldata b,
    uint48 turnNumB,
    uint256 nParticipants
  ) external pure returns (bool);
}
