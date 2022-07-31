pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "merkleTree.circom";
include "duleMux.circom";
include "commitmentHasher.circom";

// Verifies that commitment that corresponds to given secret and nullifier is included in the merkle tree of deposits
template Withdraw(levels) {
    signal input root;
    signal input winningNumber;
    signal input difference;
    signal input nullifierHash;
    signal input recipient; // not taking part in any computations

    signal input nullifier;
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    assert(difference >= 0);

    component compWN = LessThan(32);
    compWN.in[0] <== secret;
    compWN.in[1] <== winningNumber;

    component selector = DualMux();
    selector.in[0] <== secret;
    selector.in[1] <== winningNumber;
    selector.s <== compWN.out;

    component compDf = LessThan(32);
    compDf.in[0] <== difference;
    compDf.in[1] <== selector.out[0] - selector.out[1];
    compDf.out === 0;

    component hasher = CommitmentHasher();
    hasher.nullifier <== nullifier;
    hasher.secret <== secret;
    hasher.nullifierHash === nullifierHash;

    component tree = MerkleTreeChecker(levels);
    tree.leaf <== hasher.commitment;
    tree.root <== root;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }

    // Add hidden signals to make sure that tampering with recipient or fee will invalidate the snark proof
    // Most likely it is not required, but it's better to stay on the safe side and it only takes 2 constraints
    // Squares are used to prevent optimizer from removing those constraints
    signal recipientSquare;
    recipientSquare <== recipient * recipient;
}

component main {public [root,winningNumber,difference,nullifierHash,recipient]} = Withdraw(10);
