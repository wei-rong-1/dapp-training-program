// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Verifier.sol";
import "./MerkleTree.sol";
import "./Statusable.sol";

abstract contract Lottery is Statusable, MerkleTree, Ownable {
    struct Winner {
        bool withdrawed;
        bytes32 nullifierHash;
        address recipient;
    }

    struct Player {
        bool withdrawed;
        address recipient;
    }

    uint32 public winningNumber;
    uint32 public minimumDifference;
    uint32 public winnerCount;
    uint32 public playerCount;

    uint256 public immutable id;
    uint256 public immutable denomination;
    bytes32 public immutable nonceHash;
    uint256 public immutable creatingBlock;
    uint256 public immutable waitingBlocks;
    uint256 public immutable lockingBlocks;
    uint256 public startingBlock;

    Verifier public immutable verifier;

    mapping(bytes32 => bool) public commitments;
    mapping(uint32 => Player) public players;
    mapping(uint32 => Winner) public winners;

    event Commit(
        address indexed player,
        uint32 indexed playerIndex,
        uint32 leafIndex,
        bytes32 commitment
    );

    event Claim(
        address indexed winner,
        uint32 indexed winnerIndex,
        uint32 difference,
        bytes32 nullifierHash
    );

    constructor(
        uint256 _id,
        uint256 _denomination,
        uint256 _waitingBlocks,
        uint256 _lockingBlocks,
        bytes32 _nonceHash,
        uint32 _levels,
        address _verifier,
        address _hasher
    ) MerkleTree(_levels, _hasher) {
        require(_waitingBlocks > 0, "Lottery: _waitingBlocks should be > 0");
        require(_lockingBlocks > 0, "Lottery: _waitingBlocks should be > 0");
        require(_denomination > 0, "Lottery: _denomination should be > 0");
        require(
            uint256(_nonceHash) != 0,
            "Lottery: _nonceHash should not be null"
        );
        require(
            _verifier != address(0),
            "Lottery: _verifier should not be null"
        );

        minimumDifference = type(uint32).max;

        id = _id;
        denomination = _denomination;
        creatingBlock = block.number;
        waitingBlocks = _waitingBlocks;
        lockingBlocks = _lockingBlocks;
        nonceHash = _nonceHash;

        verifier = Verifier(_verifier);
    }

    /// @dev current bonus in prize pool
    /// @return uint the amount of bonus
    function currentBonus() public view virtual returns (uint);

    function commit(bytes32 _commitment)
        external
        payable
        virtual
        onlyStatus(Status.PENDING)
    {
        require(
            !commitments[_commitment],
            "Lottery: the commitment is exsited"
        );

        uint32 insertedIndex = _insert(_commitment);
        commitments[_commitment] = true;

        players[playerCount] = Player({
            withdrawed: false,
            recipient: msg.sender
        });
        playerCount++;

        _processCommit();

        emit Commit(msg.sender, playerCount - 1, insertedIndex, _commitment);
    }

    function claim(
        bytes32 _root,
        uint32 _difference,
        bytes32 _nullifierHash,
        address _recipient,
        uint256[8] calldata _proof
    ) external onlyStatus(Status.REVEALING) {
        require(isRoot(_root), "Lottery: wrong merkle root");
        require(
            _difference <= minimumDifference,
            "Lottery: invalid _difference"
        );

        require(
            verifier.verifyProof(
                [_proof[0], _proof[1]],
                [[_proof[2], _proof[3]], [_proof[4], _proof[5]]],
                [_proof[6], _proof[7]],
                [
                    uint256(_root),
                    uint256(winningNumber),
                    uint256(_difference),
                    uint256(_nullifierHash),
                    uint256(uint160(_recipient))
                ]
            ),
            "Lottery: invalid proof"
        );

        if (_difference == minimumDifference) {
            for (uint32 i = 0; i < winnerCount; i++) {
                require(
                    winners[i].nullifierHash != _nullifierHash,
                    "Lottery: no need to claim twice"
                );
            }
        } else {
            for (uint32 i = 0; i < winnerCount; i++) {
                delete (winners[i]);
            }
            minimumDifference = _difference;
            winnerCount = 0;
        }

        winners[winnerCount] = (
            Winner({
                withdrawed: false,
                nullifierHash: _nullifierHash,
                recipient: _recipient
            })
        );
        winnerCount++;

        _processClaim();

        emit Claim(_recipient, winnerCount - 1, _difference, _nullifierHash);
    }

    function prepare() external payable onlyStatus(Status.PENDING) {
        require(
            block.number > creatingBlock + waitingBlocks,
            "Lottery: waiting for committing, can not go next now"
        );

        require(playerCount > 0, "Lottery: not enough players");
    
        startingBlock = block.number;

        _prepare();
    }

    function reveal(bytes32 nonce) external onlyStatus(Status.PREPARING) {
        require(startingBlock > 0, "Lottery: no randomizing block");
        require(
            keccak256(abi.encodePacked(nonce)) == nonceHash,
            "Lottery: invalid nonce"
        );

        _reveal();

        uint256 randomNumber = _generateRandomNumber(nonce);
        winningNumber = uint32(
            uint256(keccak256(abi.encodePacked(id, nonce, randomNumber)))
        );
    }

    function finalize() external onlyStatus(Status.REVEALING) {
        require(
            block.number > startingBlock + lockingBlocks,
            "Lottery: fund is locking, can not finalize now"
        );

        _finalize();
    }

    receive() external payable {}

    function _processCommit() internal virtual {}

    function _processClaim() internal virtual {}

    function _generateRandomNumber(bytes32 nonce)
        internal
        view
        virtual
        returns (uint256);
}
