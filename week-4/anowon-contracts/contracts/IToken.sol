// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IToken {
    function redeem(uint redeemTokens) external returns (uint);
    // function redeemUnderlying(uint redeemAmount) external returns (uint);
    function mint() external payable;
    function balanceOf(address owner) external view returns (uint256);
    // function balanceOfUnderlying(address owner) external returns (uint);
}