# Filling Game – Official Rules & Complete Explanation 
👉[ **Play Filling Game:** ](https://filligamedart.vercel.app) 

Filling Game is a strategic dart-style competition played on a shared board (1–14). Both players use one unified scoring system and compete on the same board. 🏹

## 🎮 Game Concept
Players must manage number completion, maximize filler points, use circular rings strategically, and compete for bonuses — all while racing to surpass their opponent’s score. Simple structure. High strategy. Competitive tension throughout. 🎯

---

## 🕹️ How to Play

### 🏹 Turn Structure
* Each player throws 3 darts per turn.
* Player A throws 3 darts, then Player B throws 3 darts.
* Turns alternate throughout the game.
* The goal is to accumulate points strategically and pass the target score.

### 📊 Number Completion Rule
Each number must be hit according to its value to be completed:
* **Number 1** → 1 hit
* **Number 3** → 3 hits
* **Number 14** → 14 hits

* Once a player reaches the required hits, that number is completed for them.
* When both players complete a number, it becomes **fully closed** and no further points can be earned from it.

### 💰 Filler Points
Every hit on a number that is not yet completed:
* Counts toward its required total
* Earns **2 filler points**
* Once you complete that number, you stop earning filler points from it.

### 🔵 Circular Line Advantage
If a player hits a circular ring, they earn hits and filler points from **all numbers on that ring**, as if they hit each number individually. This allows faster progress and strategic advantage.

### 🎁 Bonus System
* 🔥 **Top Filler Bonus** – 7 Points
    * Applies to numbers 2–14.
    * Higher total hits wins 7 points.
    * If equal, players share 3.5 points each.
* ⚡ **Fill-Up Bonus** – 10 Points
    * The last player to complete a number earns 10 points.
    * Once both complete it, that number is permanently closed.

### 🏆 Batch System (Winning Format)
#### Batch 1
* The first player to exceed **221.5 points** ends Batch 1 immediately.
* That player’s final score becomes the **benchmark** for Batch 2.

#### Batch 2 (Qualification Round)
* The opponent now attempts to beat the Batch 1 score.
* The first player to surpass their opponent’s Batch 1 score wins the game.
* If the opponent fails to surpass it, the original Batch 1 winner wins the game.

---

# The Problem Your Project Addresses
The online casual gaming and esports industry still struggles with trust. In most Web2 lobby-based games, players connect to a centralized server that calculates scores and declares the winner. Because everything happens on that server, players have no way to verify that the game logic wasn’t manipulated or that an opponent didn’t exploit the system.

This becomes an even bigger issue when players compete for prize money.

Building a truly trustless peer-to-peer wagering system for real-time multiplayer browser games is also extremely complex. It usually requires heavy backend infrastructure, state channels, and continuously running servers to manage game state. This level of complexity makes it very difficult for independent developers or small teams to build secure and fair competitive games.

# How We’ve Addressed the Problem
We built FillGame, a decentralized peer-to-peer 1v1 casual game that replaces closed server systems with transparent smart contracts and verifiable computation.

Instead of relying on a centralized server to hold funds and decide the winner:

Players lock their entry fees securely inside the FillGameTournament smart contract deployed on Avalanche.

The game itself runs in the browser, tracking the dartboard state and recording player hits in real time.

When a match ends, the raw gameplay data is sent to a decentralized oracle network. The network replays the match logic, recalculates the final score, and cryptographically verifies the winner before any prize funds are distributed.

# How You’ve Used CRE (Chainlink Runtime Environment / Functions)
We used the Chainlink Runtime Environment through Chainlink Functions to handle game verification.

Running the full 2D dartboard physics engine directly on-chain would be extremely expensive and impractical due to gas costs. At the same time, simply trusting the browser to report the correct score would defeat the purpose of building a fair Web3 game.

To solve this, we created a custom JavaScript verification script called scoreVerifier.ts.

The FillingGameScoreboard contract sends the raw match analytics to Chainlink Functions.

The oracle network executes the verification script off-chain, recalculates the sequence of dart hits, and independently determines the correct outcome of the match.

Once the oracle network agrees on the final result, it signs the response and sends it back to the smart contract. The contract then resolves the game and unlocks the prize pool for the winner.

This approach keeps the blockchain lightweight while still benefiting from decentralized consensus for verifying the game logic.

# Chainlink
For using Chainlink Functions to verify off-chain game logic.

# Avalanche
For deploying and testing the contracts on the Avalanche network.

Designed for competition. Master the rings, claim the bonuses, and set the Bar.
