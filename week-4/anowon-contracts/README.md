# Week 4 - Anonymous Won (Anowon)

## Feature

* PoolTogether-like saving game, you won't lost your funds even don't win the game. Collect the funds from players, and send to lending/borrowing contracts to earn interest, then the interest will be the bonus of the game winner, and all funds from players will be returned.

* A game can be created by the host (the owner of CROLotteryFactory contract) from factory contract

* Then, user can "commit" and send funds to the game contract at the status of pending (initial status).

* After the player engages and waits for some blocks (waitingBlocks), the game will go to the next step, only when someone calls the "prepare" action for the game.

* If anyone call "prepare" action, funds collected will be send to the Tectonic TEther contract and start to earn interest.

* Later, when someone calls the "reveal" action for the game, The game contract will ask Witnet Randomness Contract for a random number and save it as the winning number publicly.

* Then, the game goes to the stage for claiming. Players or anyone who knows any player's nullifier and secret number can call "claim" action, if he think that his secret number is the cloest one to the winning number, he can generate the zkSNARK proof locally in the Anowon app which says that, "I have committed a number at the early pending stage that the difference between this number and the winning number is less than the "difference number" specified in my proof", and send with the transaction to the game contract. There is not any link between the anonymous and the player. No one knows which player won except the winner. That's where the name 'Anonymous Won' comes from, thanks for Tornado.cash.

* After winners claim, and specified number of blocks have been mined (locking specified blocks), the host or someone can call "finalize" action for the game to finish it and return the funds to players, the bonus to winner. So, the game is done.


## Contract

* CROLotteryFactory - the factory to create games - 0xE71A446fab72A48a0e519ac1448f98dD9269F145
* CROLottery - the game - (created by factory dynamicly)
* Verifier - verify the zkSNARK proof - 0x37dbeb913caeb6a911f85fa1f63f6147cf161326
* Hasher - the MIMCsponge hasher contract - 0xD8ea063ff0D5b6036f0D68d75636741E9a183A71

## Status

The status list of a game.

* PENDING - the initial status after creating, users can 'commit' to the game, this state will last for speciafied number of blocks (waitingBlocks). Then the host can call 'prepare' to send all collected funds to the Tectonic TEther contract to earn some interest.
* PREPARING - the host can call 'reveal' to produce the random number, supported by Witnet Randomness Contract.
* REVEALING - the players can claim with the proof to win the game, the host can call 'finalize' to finish the game after speciafied number of blocks (lockingBlocks), return funds and award bonus to winner.
* DONE - game is over

## Execution

````
yarn install

// run all tests
yarn hardhat test

// deploy to localhost/testnet/mainnet
yarn hardhat deploy --network localhost
````
