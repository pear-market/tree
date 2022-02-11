pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

/* import "hardhat/console.sol"; */
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
    uint8[8] memory masks;
    masks[0] = 1;
    masks[1] = 2;
    masks[2] = 4;
    masks[3] = 8;
    masks[4] = 16;
    masks[5] = 32;
    masks[6] = 64;
    masks[7] = 128;
    bytes memory finalData = new bytes(data.length * 8);
    uint48 latestUnique = 0;

    // 1 bits per item
    // do an AND then shift
    for (uint48 x; x < data.length; x++) {
      // all zeroes in this byte, skip it
      if (uint8(data[x]) == 0) continue;
      for (uint8 y; y < 8; y++) {
        // take the current bit and convert it to a uint8
        // use exponentiation to bit shift
        uint8 thisVal = uint8(data[x] & bytes1(masks[y])) / masks[y];
        // if non-zero add the unique value
        if (thisVal == 1) {
          finalData[8*x+y] = uniques[latestUnique++];
        }
      }
    }
    return finalData;
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
    uint8[4] memory masks;
    // 11000000 = 3
    // 00110000 = 12
    // 00001100 = 48
    // 00000011 = 192
    masks[0] = 3;
    masks[1] = 12;
    masks[2] = 48;
    masks[3] = 192;
    uint48 finalLength;
    // 0 is uniques, 1 is repeats
    uint8[] memory vals = new uint8[](data.length * 4);
    uint48[] memory indexes = new uint48[](data.length * 4);
    uint48 latestIndex = 0;

    // 2 bits per item
    // do an AND then shift
    for (uint48 x; x < data.length; x++) {
      for (uint8 y; y < 4; y++) {
        // take the current 2 bits and convert them to a uint8
        // use exponentiation to bit shift
        uint8 thisVal = uint8(data[x] & bytes1(masks[y])) / uint8(2) ** (y*2);
        // if it's a 0 insert 8 zero bits
        // otherwise pull from the uniques or repeats array
        if (thisVal == 0) {
          finalLength += 1;
        } else if (thisVal == 1) {
          finalLength += 1;
          vals[4*x+y] = thisVal;
          indexes[latestIndex++] = 4*x+y;
        } else {
          finalLength += 32;
          vals[4*x+y] = thisVal;
          indexes[latestIndex++] = 4*x+y;
        }
      }
    }
    bytes memory finalData = new bytes(finalLength);
    uint48 latestUnique = 0;
    for (uint48 x; x < latestIndex; x++) {
      uint48 index = indexes[x];
      uint8 thisVal = vals[index];
      if (thisVal == 1) {
        finalData[index] = uniques[latestUnique++];
      } else if (thisVal > 1) {
        bytes memory b = bytes32ToBytes(repeats[thisVal == 2 ? 0 : 1]);
        for (uint8 z; z < 32; z++) {
          finalData[index + z] = b[z];
        }
      }
    }
    return finalData;
  }
/*
  function decodeByte(bytes1 b, uint8 offset) internal view returns (uint8) {
    return uint8(b & bytes1(masks[offset])) / uint8(2) ** (offset*2);
  } */

  function bytes32ToBytes(bytes32 input) internal view returns (bytes memory) {
    // index is every 8 bits
    bytes memory b = new bytes(32);
    assembly {
      mstore(add(b, 32), input)
    }
    return b;
  }
}
