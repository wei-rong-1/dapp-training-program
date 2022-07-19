// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FruitStandOriginal {

    struct UserStake {
        uint startBlock;
        uint stakeAmount;
    }

    ERC20 water;
    ERC20 melon;
    mapping (address => UserStake) userStakes;

    constructor(address _water, address _melon) {
        water = ERC20(_water);
        melon = ERC20(_melon);
    }

    function stake(uint _amount) external {
        require(_amount > 0, "FruitStand: Stake amount must be greater than zero");
        if (userStakes[msg.sender].startBlock != 0) {
            // Pay out current stake
            payout(msg.sender, userStakes[msg.sender]);
        }
        water.transferFrom(msg.sender, address(this), _amount);
        UserStake memory newStake = UserStake({ startBlock: block.number, stakeAmount: _amount });
        userStakes[msg.sender] = newStake; 
    }

    function unstake() external {
        require(userStakes[msg.sender].startBlock != 0, "FruitStand: User have not staked");
        payout(msg.sender, userStakes[msg.sender]);
        water.transfer(msg.sender, userStakes[msg.sender].stakeAmount);
        userStakes[msg.sender] = UserStake({ startBlock: 0, stakeAmount: 0 }); 
    }

    function payout(address user, UserStake memory _stake) internal returns (uint8 errCode) {
        uint blockDelta = block.number - _stake.startBlock;
        if (blockDelta > 300) {
            blockDelta = 300;
        }
        uint multiplier = fib(blockDelta); 
        uint rewardAmount = multiplier * _stake.stakeAmount;
        melon.transfer(user, rewardAmount);
        return 0;
    }

    function fib(uint n) public view returns (uint fn) {
        if (n == 0) {
            return 0;
        }
        else if (n == 1) {
            return 1;
        }
        else if (n > 1) {
            return fib(n-2) + fib(n-1);
        }
    }

}