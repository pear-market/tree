pragma solidity ^0.7.0;

interface IReceiver {
  struct Data {
    uint8 method;
    bytes data;
  }
  function callMethod(bytes memory data) external;
}
