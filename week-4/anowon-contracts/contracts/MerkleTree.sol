// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IHasher.sol";

contract MerkleTree {
  uint256 public constant FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
  uint256 public constant ZERO_VALUE = 20343323298587817426263677225246066699666576009463223639062948340668151826010; // = keccak256("anowon") % FIELD_SIZE
  IHasher public immutable hasher;

  uint32 public levels;

  // the following variables are made public for easier testing and debugging and
  // are not supposed to be accessed in regular code

  // filledSubtrees and roots could be bytes32[size], but using mappings makes it cheaper because
  // it removes index range check on every interaction
  mapping(uint256 => bytes32) public filledSubtrees;
  bytes32 public root;
  uint32 public nextIndex = 0;

  constructor(uint32 _levels, address _hasher) {
    require(_levels > 0, "MerkleTree: _levels should be greater than zero");
    require(_levels < 11, "MerkleTree: _levels should be less than 11");
    require(_hasher != address(0), "MerkleTree: _hasher should not be null");

    levels = _levels;
    hasher = IHasher(_hasher);
    root = zeros(_levels - 1);

    for (uint32 i = 0; i < _levels; i++) {
      filledSubtrees[i] = zeros(i);
    }
  }

  /**
    @dev Hash 2 tree leaves, returns MiMC(_left, _right)
  */
  function hashLeftRight(
    IHasher _hasher,
    bytes32 _left,
    bytes32 _right
  ) public pure returns (bytes32) {
    require(uint256(_left) < FIELD_SIZE, "MerkleTree: _left should be inside the field");
    require(uint256(_right) < FIELD_SIZE, "MerkleTree: _right should be inside the field");
    uint256 R = uint256(_left);
    uint256 C = 0;
    (R, C) = _hasher.MiMCSponge(R, C, 0);
    R = addmod(R, uint256(_right), FIELD_SIZE);
    (R, C) = _hasher.MiMCSponge(R, C, 0);
    return bytes32(R);
  }

  function _insert(bytes32 _leaf) internal returns (uint32 index) {
    uint32 _nextIndex = nextIndex;
    require(_nextIndex != uint32(2)**levels, "MerkleTree: tree is full. No more leaves can be added");
    uint32 currentIndex = _nextIndex;
    bytes32 currentLevelHash = _leaf;
    bytes32 left;
    bytes32 right;

    for (uint32 i = 0; i < levels; i++) {
      if (currentIndex % 2 == 0) {
        left = currentLevelHash;
        right = zeros(i);
        filledSubtrees[i] = currentLevelHash;
      } else {
        left = filledSubtrees[i];
        right = currentLevelHash;
      }
      currentLevelHash = hashLeftRight(hasher, left, right);
      currentIndex /= 2;
    }

    root = currentLevelHash;
    nextIndex = _nextIndex + 1;
    return _nextIndex;
  }

  /**
    @dev Whether the root is right
  */
  function isRoot(bytes32 _root) public view returns (bool) {
    return _root == root;
  }

  /// @dev provides Zero (Empty) elements for a MiMC MerkleTree. Up to 10 levels
  function zeros(uint256 i) public pure returns (bytes32) {
    if (i == 0) return bytes32(0x2cf9e9b70ba26273d0d92524f1f242af2b129368526a6b0ab4ae5b3c7dd7065a);
    else if (i == 1) return bytes32(0x1635b2d36ff63121694af49a4d3c3cca8c740fcfe2aa33e7a4f6202e59fd4f44);
    else if (i == 2) return bytes32(0x16393d132a31040fe66b041853502aad2deffb6fbaddbdbef588a2954282942b);
    else if (i == 3) return bytes32(0x0a3ae4392887fb7944f5cec9d35f2543280c655dd770be15bc22c9dd29194cba);
    else if (i == 4) return bytes32(0x24ff60aad4c2e0c6f767bd185a5a654b4d8d4177fc255d945e7f3376bc467700);
    else if (i == 5) return bytes32(0x0759516e53eb36eb2ec242a0822d280b6d809e02af7da37313b41023c0b8a071);
    else if (i == 6) return bytes32(0x07417447bde93ab35150909062b8e02f39df89d070c35cbf1b9c0cf40c11e703);
    else if (i == 7) return bytes32(0x1bfd31be5498363e0675ab0b52903cb93d500ad5d2930dc503f846d2e240f711);
    else if (i == 8) return bytes32(0x15fb7c999bcc1c8961a584a78e4ff1c97037ae3ffbdfd8c1ef82e92e1d985422);
    else if (i == 9) return bytes32(0x28088429e37798c8f5a3f6ef6b26dac6c957974f30df1da1dfe110fd3358ac15);
    else if (i == 10) return bytes32(0x116fa58935dd461ff4956795241840c9fe15a28a8dfbc59141b666c07060394f);
    else revert("MerkleTree: index out of bounds");
  }
}
