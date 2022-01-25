pragma solidity ^0.7.0;

contract BLSKeyCache {
  mapping (uint48 => uint[4]) publicKeys;
  uint48 count;

  function registerPublicKey(uint[4] memory key) public returns (uint48) {
    require(count < type(uint48).max);
    publicKeys[count] = key;
    count++;
    return count;
  }
}
