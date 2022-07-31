// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "witnet-solidity-bridge/contracts/interfaces/IWitnetRandomness.sol";

abstract contract WitnetRNG {
    IWitnetRandomness public witnet;

    constructor(address _witnet) {
        require(_witnet != address(0), "WitnetRNG: invalid witnet contract address");

        witnet = IWitnetRandomness(_witnet);
    }

    function _checkRandomize(uint256 blockNumber) internal view {
        require(witnet.isRandomized(blockNumber), "WitnetRNG: block should be randomized");
    }

    function _randomize(uint256 blockNumber) internal {
        if (!witnet.isRandomized(blockNumber)) {
            uint256 _usedFunds = witnet.randomize{value: msg.value}();
            if (_usedFunds < msg.value) {
                payable(msg.sender).transfer(msg.value - _usedFunds);
            }
        }
    }

    function _getRandomNumber(bytes32 nonce, uint256 blockNumber)
        internal
        view
        returns (uint32)
    {
        return witnet.random(type(uint32).max, uint256(nonce), blockNumber);
    }
}
