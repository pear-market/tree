pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";
import { IReceiver } from "./interfaces/IDecompressReceiver.sol";

contract Decompressor {

  IReceiver immutable receiver;

  constructor(address _receiver) {
    receiver = IReceiver(_receiver);
  }

  function decompressSimpleCall(
    bytes calldata data,
    bytes calldata uniques
  ) public {
    bytes memory finalData = decompressSimple(data, uniques);
    // now pass the finalData to another function
    receiver.callMethod(finalData);
  }

  function decompressSimple(
    bytes calldata data,
    bytes calldata uniques
  ) public view returns (bytes memory) {
    bytes32[2] memory repeats;
    return decompress(data, uniques, repeats);
  }

  /**
   * A 0 set indicates 1 zero byte
   * A 1 set indicates an entry from the dict
   * The value 2 indicates the first repeat entry
   * The value 3 indicates the second repeat entry
   *
   * bytes are big endian, integers are little endian
   **/
  function decompress(
    bytes calldata data,
    bytes calldata uniques,
    bytes32[2] memory repeats
  ) public view returns (bytes memory) {
    // 2 bits per item
    uint8[] memory vals = new uint8[](data.length * 4);
    // do an AND then shift
    uint finalLength;
    for (uint x; x < data.length; x++) {
      // take sets of 2 bits
      for (uint8 y; y < 4; y++) {
        // take the current 2 bits
        // 11000000 = 3
        // 00110000 = 12
        // 00001100 = 48
        // 00000011 = 192
        uint8 mask;
        if (y == 0) mask = 3;
        else if (y == 1) mask = 12;
        else if (y == 2) mask = 48;
        else if (y == 3) mask = 192;
        // use exponentiation to bit shift
        uint8 thisVal = uint8(data[x] & bytes1(mask)) / uint8(2) ** (y*2);
        // if it's a 0 insert 8 zero bits
        // otherwise pull from the uniques array
        if (thisVal == 0) {
          finalLength += 1;
        } else if (thisVal == 1) {
          finalLength += 1;
        } else {
          finalLength += 32;
        }
        vals[4*x + y] = thisVal;
        /* console.log(thisVal); */
      }
    }
    bytes memory finalData = new bytes(finalLength);
    uint latestUnique = 0;
    for (uint x; x < vals.length; x++) {
      uint8 val = vals[x];
      if (val == 0) {
        /* finalData[x] = bytes1(0); */
      } else if (val == 1) {
        finalData[x] = uniques[latestUnique++];
      } else {
        // put 32 bytes in the array zzzz
        bytes memory b = bytes32ToBytes(repeats[val]);
        // TODO: use concat
        for (uint8 y; y < 32; y++) {
          finalData[x++] = b[y];
        }
        x--;
      }
    }
    return finalData;
  }

  function bytes32ToBytes(bytes32 input) internal view returns (bytes memory) {
    // index is every 8 bits
    bytes memory b = new bytes(32);
    assembly {
      mstore(add(b, 32), input)
    }
    return b;
  }
}
