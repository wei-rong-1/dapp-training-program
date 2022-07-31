// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DummyWitnet {
    mapping(uint256 => bool) public randomizedblocks;

    function isRandomized(uint256 _block) external view returns (bool) {
        return randomizedblocks[_block];
    }

    function random(
        uint32 _range,
        uint256 _nonce,
        uint256 _block
    ) external pure returns (uint32) {
        return uint32(addmod(_block, _nonce, _range));
    }

    function randomize() external payable returns (uint256 _usedFunds) {
        randomizedblocks[block.number] = true;
        payable(msg.sender).transfer(msg.value - 100 gwei);
        return 100 gwei;
    }
}
