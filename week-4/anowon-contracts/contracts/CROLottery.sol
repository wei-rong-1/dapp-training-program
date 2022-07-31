// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Lottery.sol";
import "./WitnetRNG.sol";
import "./IToken.sol";

/// @title CRO Lottery
/// @dev use witnet as RNG, unknown security level, 
///    the bonus comes from the interest of tectonic minting  
contract CROLottery is Lottery, WitnetRNG {
    IToken public token;

    constructor(
        uint256 _id,
        uint256 _denomination,
        uint256 _waitingBlocks,
        uint256 _lockingBlocks,
        bytes32 _nonceHash,
        uint32 _levels,
        address _verifier,
        address _hasher,
        address _witnet,
        address _token
    )
        Lottery(
            _id,
            _denomination,
            _waitingBlocks,
            _lockingBlocks,
            _nonceHash,
            _levels,
            _verifier,
            _hasher
        )
        WitnetRNG(_witnet)
    {
        require(_token != address(0), "CROLottery: invalid tectonic contract");

        token = IToken(_token);
    }

    /// @dev get current bonus amount from tectonic
    /// @return uint the amount of bonus
    function currentBonus() public view override returns (uint) {
        uint balance = token.balanceOf(address(this));
        if (balance > playerCount * denomination) {
            return balance - playerCount * denomination;
        } else {
            return 0;
        }
    }

    function _processCommit() internal override {
        require(
            msg.value == denomination,
            "CROLottery: value should be equal to denomination"
        );
    }

    function _generateRandomNumber(bytes32 nonce)
        internal
        view
        override
        returns (uint256)
    {
        uint32 randomNumber = _getRandomNumber(nonce, startingBlock);
        return uint256(randomNumber);
    }

    function _afterPrepare() internal override {
        _randomize(startingBlock);

        // send fund to tectonic as supplyment
        uint256 _funds = denomination * playerCount;
        require(
            address(this).balance >= _funds,
            "CROLottery: insufficient funds"
        );
        token.mint{value: _funds}();
    }

    function _beforeReveal() internal view override {
        _checkRandomize(startingBlock);
    }

    function _afterFinalize() internal override {
        uint256 balance = token.balanceOf(address(this));
        uint256 bonus = 0;
        uint256 funds = 0;

        if (balance > playerCount * denomination) {
            funds = playerCount * denomination;
            bonus = balance - funds;
        } else {
            funds = balance;
        }

        uint256 err = token.redeem(balance);
        require(err == 0, "CROLottery: redeem failed");

        _returnFundsToPlayers(funds);
        _giveBonusToWinners(bonus);

        // send remaining funds to factory contract or owner.
        payable(owner()).transfer(address(this).balance);
    }

    function _returnFundsToPlayers(uint256 funds) internal {
        uint256 retFundsPerPayer = funds / playerCount;
        for (uint32 i = 0; i < playerCount; i++) {
            if (players[i].withdrawed == false) {
                continue;
            }

            players[i].withdrawed = true;
            payable(players[i].recipient).transfer(retFundsPerPayer);
        }
    }

    function _giveBonusToWinners(uint256 bonus) internal {
        if (bonus == 0) return;

        uint256 bonusPerWinner = bonus / winnerCount;
        for (uint32 i = 0; i < winnerCount; i++) {
            if (winners[i].withdrawed != false) {
                continue;
            }

            winners[i].withdrawed = true;
            payable(winners[i].recipient).transfer(bonusPerWinner);
        }
    }
}
