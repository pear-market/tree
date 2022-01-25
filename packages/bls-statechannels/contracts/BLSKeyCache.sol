pragma solidity ^0.7.0;

contract BLSKeyCache {
  mapping (uint48 => uint[4]) publicKeys;
  mapping (bytes32 => uint48) indexesByKey;
  uint48 count = 1;

  function registerPublicKey(uint[4] memory key) public returns (uint48) {
    require(count < type(uint48).max);
    bytes32 h = keccak256(abi.encodePacked(key));
    require(indexesByKey[h] == 0);
    uint48 index = count++;
    indexesByKey[h] = index;
    publicKeys[index] = key;
    return index;
  }

  function indexByKey(uint[4] memory key) public view returns (uint48) {
    bytes32 h = keccak256(abi.encodePacked(key));
    return indexesByKey[h];
  }
}
