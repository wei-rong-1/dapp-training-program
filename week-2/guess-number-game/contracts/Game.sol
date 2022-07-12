// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/** @title Guess Game */
contract Game {
    uint16 public immutable playerNum;
    uint256 public immutable minimumDeposit;
    bytes32 public immutable nonceHash;
    bytes32 public immutable nonceNumHash;

    bool public concluded;
    address public host;
    address[] public players;
    uint16[] public playerGuesses;

    modifier onlyNotConcluded() {
        require(concluded == false, "game was conducted");
        _;
    }

    constructor(
        bytes32 _nonceHash,
        bytes32 _nonceNumHash,
        uint16 _playerNum
    ) payable {
        require(msg.value > 0, "deposte is required");
        require(_playerNum >= 2, "player number should be 2 at least");

        minimumDeposit = msg.value;
        nonceHash = _nonceHash;
        nonceNumHash = _nonceNumHash;
        playerNum = _playerNum;
    }

    /// @dev player guess a number.
    /// @param number The number guessed by player.
    function guess(uint16 number) external payable onlyNotConcluded {
        require(msg.value == minimumDeposit, "mismatched deposit");
        require(number >= 0 && number < 1000, "guess number out of range");
        require(players.length < playerNum, "no more place to guess");

        for (uint256 i = 0; i < players.length; i++) {
            require(players[i] != msg.sender, "should not guess twice");
        }

        for (uint256 i = 0; i < playerGuesses.length; i++) {
            require(
                playerGuesses[i] != number,
                "should not guess the same number"
            );
        }

        players.push(msg.sender);
        playerGuesses.push(number);
    }

    /// @dev host to reveal the result of the game.
    /// @param nonce The secret key to protect the number.
    /// @param number The right number.
    function reveal(bytes32 nonce, uint16 number) external onlyNotConcluded {
        require(keccak256(abi.encodePacked(nonce)) == nonceHash, "wrong nonce");
        require(
            keccak256(abi.encodePacked(nonce, number)) == nonceNumHash,
            "wrong nunber"
        );
        require(players.length == playerNum, "not enough players joined");

        concluded = true;

        if (!(number >= 0 && number < 1000)) {
            uint256 rewardPerPlayer = (minimumDeposit * (playerNum + 1)) /
                playerNum;
            for (uint256 i = 0; i < players.length; i++) {
                payable(players[i]).transfer(rewardPerPlayer);
            }
            return;
        }

        uint256[] memory deltas = new uint256[](playerNum);
        uint256 minimumDelta = 1000;
        uint256 winnerNum = 0;
        for (uint256 i = 0; i < playerGuesses.length; i++) {
            deltas[i] = playerGuesses[i] >= number
                ? playerGuesses[i] - number
                : number - playerGuesses[i];
            if (minimumDelta == deltas[i]) {
                winnerNum++;
            } else if (minimumDelta > deltas[i]) {
                minimumDelta = deltas[i];
                winnerNum = 1;
            }
        }

        uint256 rewardPerWinner = (minimumDeposit * (playerNum + 1)) /
            winnerNum;
        for (uint256 i = 0; i < deltas.length; i++) {
            if (minimumDelta == deltas[i]) {
                payable(players[i]).transfer(rewardPerWinner);
            }
        }
    }
}
