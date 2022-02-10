pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import { BLSMove } from "./BLSMove.sol";
import { IBLSMove } from "./interfaces/IBLSMove.sol";
import { AssetHolder } from "./AssetHolder.sol";
import { OutcomeFormat } from "./Outcome.sol";

contract Adjudicator is BLSMove, AssetHolder {
  constructor(address _appDefintion, uint48 _challengeDuration, bytes32 _domain) BLSMove(_appDefintion, _challengeDuration, _domain) {}

  // assume we're depositing ether
  function depositAndRequestKeyIndex(
    uint[4] memory publicKey,
    uint48 requestedIndex,
    bytes32 channelId,
    uint expectedHeld
  ) public payable {
    this.registerPublicKeyIndex(publicKey, requestedIndex);
    this.deposit{ value: msg.value }(
      address(0),
      channelId,
      expectedHeld,
      msg.value
    );
  }

  function multiConcludeWithdrawSingleParty(
    uint48 singleParty,
    IBLSMove.MinFixedPart[] calldata fixedParts,
    bytes[] memory outcomeBytes,
    uint[2] calldata signature
  ) public {
    IBLSMove.MinFixedPart[] memory finalParts = new IBLSMove.MinFixedPart[](fixedParts.length);
    for (uint48 x = 0; x < fixedParts.length; x++) {
      uint48[] memory participants = new uint48[](2);
      participants[0] = singleParty;
      participants[1] = fixedParts[x].participants[0];
      finalParts[x] = IBLSMove.MinFixedPart({
        participants: participants,
        nonce: fixedParts[x].nonce
      });
    }
    multiConcludeWithdraw(finalParts, outcomeBytes, signature);
  }

  function multiConcludeWithdraw(
    IBLSMove.MinFixedPart[] memory fixedParts,
    bytes[] memory outcomeBytes,
    // OutcomeFormat.Outcome[] calldata outcomes,
    uint[2] calldata signature
  ) public {
    require(fixedParts.length == outcomeBytes.length);
    // construct the outcome hashes from the outcomes
    bytes32[] memory outcomeHashes = new bytes32[](outcomeBytes.length);
    for (uint48 x = 0; x < outcomeBytes.length; x++) {
      outcomeHashes[x] = keccak256(outcomeBytes[x]);
    }
    _multiConclude(
      fixedParts,
      outcomeHashes,
      signature
    );
    OutcomeFormat.Outcome[][] memory outcomes = new OutcomeFormat.Outcome[][](outcomeBytes.length);
    uint totalExits = 0;
    for (uint48 x = 0; x < outcomes.length; x++) {
      outcomes[x] = OutcomeFormat.decodeOutcome(outcomeBytes[x]);
      totalExits += outcomes[x].length;
    }
    OutcomeFormat.Outcome[] memory exits = new OutcomeFormat.Outcome[](totalExits);
    uint48 exitIndex = 0;
    uint[] memory totalPayouts = new uint[](totalExits);
    uint48 totalPayoutIndex = 0;
    for (uint48 x = 0; x < outcomes.length; x++) {
      // for each outcome
      bytes32 channelId = _getChannelId(fixedParts[x].participants, fixedParts[x].nonce);
      OutcomeFormat.Outcome[] memory outcome = outcomes[x];
      for (uint48 y = 0; y < outcome.length; y++) {
        address asset = outcome[y].asset;
        uint initialHoldings = holdings[asset][channelId];
        (
          OutcomeFormat.Allocation[] memory newAllocations,
          bool allocatesOnlyZeros,
          OutcomeFormat.Allocation[] memory exitAllocations,
          uint totalPayoutsForAsset
        ) = compute_transfer_effects_and_interactions(
          initialHoldings,
          outcome[y].allocations,
          new uint[](0)
        );
        totalPayouts[totalPayoutIndex++] = totalPayoutsForAsset;
        outcome[y].allocations = newAllocations;
        exits[exitIndex++] = OutcomeFormat.Outcome(
          asset,
          outcome[y].metadata,
          exitAllocations
        );
        holdings[asset][channelId] -= totalPayoutsForAsset;
        // emit AllocationUpdated(channelId, y, initialHoldings);
      }
      // TODO: figure out if i need a real state hash here
      bytes32 stateHash = bytes32(0);
      _updateFingerprint(channelId, stateHash, outcomeHashes[x]);
    }
    for (uint48 x; x < exits.length; x++) {
      _executeSingleAssetExit(exits[x]);
    }
  }

  function transferAllAssets(
    bytes32 channelId,
    bytes memory outcomeBytes,
    bytes32 stateHash
  ) public {
    _requireChannelNotFinalized(channelId);
    _requireMatchingFingerprint(stateHash, keccak256(outcomeBytes), channelId);


  }
}
