// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DummyTCRO is ERC20 {

    constructor() ERC20("Tectonic CRO", "TCRO") {
    }

    function redeem(uint redeemTokens) external returns (uint) {
        _burn(msg.sender, redeemTokens);
        payable(msg.sender).transfer(redeemTokens);
        return 0;
    }

    function mint() external payable {
        _mint(msg.sender, msg.value + msg.value * 1 ether / 10 ether);
    }
}
