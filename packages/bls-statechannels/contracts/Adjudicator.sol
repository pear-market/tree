pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import { BLSMove } from "./BLSMove.sol";
import { AssetHolder } from "./AssetHolder.sol";

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
    this.deposit(
      address(0),
      channelId,
      expectedHeld,
      msg.value
    );
  }
}
