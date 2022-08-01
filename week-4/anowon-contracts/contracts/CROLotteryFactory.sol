// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CROLottery.sol";

contract CROLotteryFactory is Ownable {
    uint256 public counter;

    uint32 public levels;
    address public hasher;
    address public verifier;

    address public witnet;
    address public tCRO;

    Lottery[] private lotteries;

    constructor(
        uint32 _levels,
        address _hasher,
        address _verifier,
        address _witnet,
        address _tCRO
    ) {
        levels = _levels;
        hasher = _hasher;
        verifier = _verifier;
        witnet = _witnet;
        tCRO = _tCRO;
    }

    function createLottery(
        bytes32 _nonceHash,
        uint256 _denomination,
        uint256 _waitingBlocks,
        uint256 _lockingBlocks
    ) public returns (address) {
        CROLottery newLottery = new CROLottery(
            counter,
            _denomination,
            _waitingBlocks,
            _lockingBlocks,
            _nonceHash,
            levels,
            verifier,
            hasher,
            witnet,
            tCRO
        );
        lotteries.push(newLottery);
        counter++;

        return address(newLottery);
    }

    function lottery(uint256 id) public view returns (address) {
        return address(lotteries[id]);
    }

    function lotteryCount() public view returns (uint) {
        return counter;
    }

    function setLevels(uint32 _levels) public onlyOwner {
        levels = _levels;
    }

    function setHasher(address _hasher) public onlyOwner {
        hasher = _hasher;
    }

    function setVerifier(address _verifier) public onlyOwner {
        verifier = _verifier;
    }

    function setWitnet(address _witnet) public onlyOwner {
        witnet = _witnet;
    }

    function setTCRO(address _tCRO) public onlyOwner {
        tCRO = _tCRO;
    }

    function withdraw() external {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
}
