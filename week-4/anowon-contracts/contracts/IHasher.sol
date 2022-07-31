// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IHasher {
  function MiMCSponge(uint256 xL_in, uint256 xR_in, uint256 k) external pure returns (uint256 xL, uint256 xR);
}