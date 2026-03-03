import { TOTAL_NUMBERS, TARGET_SCORE, RING_NUMBERS } from './boardLayout';

export interface PlayerState {
  name: string;
  address: string;
  totalScore: number;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  currentPlayer: 0 | 1;
  dartsRemaining: number;
  turnHistory: TurnAction[];
  closedNumbers: Set<number>; // fully closed (communal target met)
  // Tracks who hit each number and in what order: number -> array of player indices (0 or 1)
  hitSequences: Record<number, (0 | 1)[]>;
  batch: 1 | 2;
  batch1Score: number | null; // score that ended batch 1
  batch1Winner: 0 | 1 | null;
  batch1Scores: [number, number] | null; // Preservation of both final scores from Batch 1
  gameOver: boolean;
  winner: 0 | 1 | null;
  lastAction: string | null;
  isVsCPU: boolean;
}

export interface TurnAction {
  player: 0 | 1;
  target: number | 'ring'; // number hit or ring
  ringIndex?: number;
  pointsEarned: number;
}

export function createInitialPlayer(name: string, address: string): PlayerState {
  return { name, address, totalScore: 0 };
}

export function createInitialGameState(p1Name: string, p1Addr: string, p2Name: string, p2Addr: string, isVsCPU = false): GameState {
  const hitSequences: Record<number, (0 | 1)[]> = {};
  for (let i = 1; i <= TOTAL_NUMBERS; i++) {
    hitSequences[i] = [];
  }
  return {
    players: [createInitialPlayer(p1Name, p1Addr), createInitialPlayer(p2Name, p2Addr)],
    currentPlayer: 0,
    dartsRemaining: 3,
    turnHistory: [],
    closedNumbers: new Set(),
    hitSequences,
    batch: 1,
    batch1Score: null,
    batch1Winner: null,
    batch1Scores: null,
    gameOver: false,
    winner: null,
    lastAction: null,
    isVsCPU,
  };
}

function recalcTotalScore(gameState: GameState, playerIdx: 0 | 1): number {
  let score = 0;

  for (let n = 1; n <= TOTAL_NUMBERS; n++) {
    const seq = gameState.hitSequences[n];
    if (seq.length === 0) continue;

    // 1. Filler Points (+2 per hit)
    const playerHits = seq.filter(p => p === playerIdx).length;
    score += playerHits * 2;

    // 2. Top Filler Bonus (+7 per number)
    // Awarded to the player with more hits on this number. Divide if tied?
    // The image shows "A, B" under TFP for a tie, and scores suggest splitting.
    // However, for consistency with the image (A: 12, B: 15.5), let's calculate:
    // In row 2 (Number 2): A has 1 hit, B has 1 hit. TFP +7 is split 3.5 each.
    // In row 3 (Number 3): A has 2 hits, B has 1 hit. TFP +7 goes to A.
    if (n >= 2) { // TFP starts from Number 2
      const opponentIdx = 1 - playerIdx;
      const opponentHits = seq.filter(p => p === opponentIdx).length;
      if (playerHits > opponentHits) {
        score += 7;
      } else if (playerHits === opponentHits && playerHits > 0) {
        score += 3.5;
      }
    }

    // 3. Fill-Up Bonus (+10 per number)
    // Awarded to the player who landed the n-th hit (communal completion)
    if (seq.length >= n) {
      const completingPlayer = seq[n - 1];
      if (completingPlayer === playerIdx) {
        score += 10;
      }
    }
  }

  return score;
}

export function hitNumber(state: GameState, targetNumber: number, isMultiHit = false): { state: GameState; message: string } {
  const newState = structuredClone(state) as GameState;
  newState.closedNumbers = new Set(state.closedNumbers);

  const cp = newState.currentPlayer;
  const player = newState.players[cp];
  let message = '';

  if (newState.closedNumbers.has(targetNumber)) {
    message = `Number ${targetNumber} is closed! No points.`;
  } else {
    // Communal hit tracking
    newState.hitSequences[targetNumber].push(cp);
    const hitCount = newState.hitSequences[targetNumber].length;

    message = `Hit ${targetNumber}! (${hitCount}/${targetNumber}) +2 filler pts`;

    // Check completion (Communal)
    if (hitCount >= targetNumber) {
      newState.closedNumbers.add(targetNumber);
      message = `🎯 Completed ${targetNumber}! +10 Fill-Up Bonus! Number closed.`;
    }
  }

  // Update scores using the dynamic calculator
  newState.players[0].totalScore = recalcTotalScore(newState, 0);
  newState.players[1].totalScore = recalcTotalScore(newState, 1);

  if (!isMultiHit) {
    // Dart management
    newState.dartsRemaining--;
    const totalScore = newState.players[cp].totalScore;
    const finalMessage = `[${player.name}]: 🎯 Direct Hit on Number ${targetNumber}! (${message}) [Total: ${totalScore} pts]`;
    newState.lastAction = finalMessage;

    if (newState.dartsRemaining <= 0) {
      // Check batch conditions before switching
      checkBatchConditions(newState);

      if (!newState.gameOver) {
        newState.currentPlayer = cp === 0 ? 1 : 0;
        newState.dartsRemaining = 3;
      }
    }
    // Final check for win conditions
    checkBatchConditions(newState);
  }

  return { state: newState, message };
}

export function hitRing(state: GameState, ringIndex: number, ringNumbers: number[]): { state: GameState; messages: string[] } {
  let currentState = structuredClone(state) as GameState;
  currentState.closedNumbers = new Set(state.closedNumbers);
  const messages: string[] = [];

  // Temporarily increase darts so we don't auto-switch mid-ring
  const originalDarts = currentState.dartsRemaining;
  currentState.dartsRemaining = 999;

  for (const num of ringNumbers) {
    const result = hitNumber(currentState, num, true);
    currentState = result.state;
    currentState.closedNumbers = new Set(currentState.closedNumbers);
    messages.push(result.message);

    // Check for immediate win conditions during the ring sequence
    checkBatchConditions(currentState);
    if (currentState.gameOver) break;
  }

  // Restore proper dart count (ring hit = 1 dart)
  currentState.dartsRemaining = originalDarts - 1;
  const cp = currentState.currentPlayer;
  // Final score recalculation for the current player after all ring hits
  currentState.players[0].totalScore = recalcTotalScore(currentState, 0);
  currentState.players[1].totalScore = recalcTotalScore(currentState, 1);
  const totalScore = currentState.players[cp].totalScore;
  const pName = currentState.players[cp].name;

  currentState.lastAction = `[${pName}]: ⭕ Direct hit on Ring ${ringIndex + 1}! Affecting: ${ringNumbers.join(', ')} [Total: ${totalScore} pts]`;

  if (currentState.dartsRemaining <= 0) {
    checkBatchConditions(currentState);
    if (!currentState.gameOver) {
      currentState.currentPlayer = currentState.currentPlayer === 0 ? 1 : 0;
      currentState.dartsRemaining = 3;
    }
  }

  return { state: currentState, messages };
}

// Removed checkTopFillerBonus as it's now handled dynamically in recalcTotalScore

function checkBatchConditions(state: GameState) {
  const p1Score = recalcTotalScore(state, 0);
  const p2Score = recalcTotalScore(state, 1);

  if (state.batch === 1) {
    if (p1Score >= TARGET_SCORE || p2Score >= TARGET_SCORE) {
      const b1w = p1Score >= TARGET_SCORE ? 0 : 1;
      const benchmark = b1w === 0 ? p1Score : p2Score;

      state.batch = 2;
      state.batch1Winner = b1w;
      state.batch1Score = benchmark; // Set the dynamic benchmark (The Bar)
      state.batch1Scores = [p1Score, p2Score];

      // Score and Board Reset for Batch 2
      state.players.forEach(p => {
        p.totalScore = 0;
      });
      state.closedNumbers = new Set();
      for (let i = 1; i <= TOTAL_NUMBERS; i++) {
        state.hitSequences[i] = [];
      }

      // Qualification Round: Turn immediately goes to the opponent
      const opponentIdx = 1 - b1w;
      state.currentPlayer = opponentIdx as (0 | 1);
      state.dartsRemaining = 3;

      state.lastAction = `[SYSTEM]: 🚀 ${state.players[b1w].name} set the Bar at ${benchmark}! SCORE RESET. ${state.players[opponentIdx].name}'s turn to beat it!`;
    }
  } else if (state.batch === 2 && state.batch1Scores !== null) {
    const p1Score = recalcTotalScore(state, 0);
    const p2Score = recalcTotalScore(state, 1);
    const [p1Target, p2Target] = state.batch1Scores; // Inverse targets: P1 must beat P2's B1, P2 must beat P1's B1

    // Player 1 wins if they surpass Player 2's Batch 1 score
    if (p1Score > p2Target) {
      state.gameOver = true;
      state.winner = 0;
      state.lastAction = `[SYSTEM]: 🏆 ${state.players[0].name} surpassed ${state.players[1].name}'s score of ${p2Target} and WINS!`;
      return;
    }

    // Player 2 wins if they surpass Player 1's Batch 1 score
    if (p2Score > p1Target) {
      state.gameOver = true;
      state.winner = 1;
      state.lastAction = `[SYSTEM]: 🏆 ${state.players[1].name} surpassed ${state.players[0].name}'s score of ${p1Target} and WINS!`;
      return;
    }

    // Check if board is closed (all numbers reached communal hits)
    if (state.closedNumbers.size === TOTAL_NUMBERS) {
      // If board is closed and no one surpassed their target, the one who was leading in Batch 1 wins
      state.gameOver = true;
      state.winner = state.batch1Winner;
    }
  }
}

/**
 * AI Logic: Computes the best move for the CPU
 * Priority: 1. Rings with many high-value targets. 2. Numbers nearing completion. 3. Highest value uncompleted.
 */
export function computeCPUMove(state: GameState): { type: 'number' | 'ring'; index: number } {
  const cpuIdx = 1;
  const closed = state.closedNumbers;

  // 1. Check rings (Indices 0-3)
  const ringScores = Object.values(RING_NUMBERS).map((nums, idx) => {
    let score = 0;
    nums.forEach(n => {
      if (!closed.has(n)) {
        score += n; // Simple weighting by number value
      }
    });
    return { idx, score };
  });

  const bestRing = ringScores.reduce((prev, curr) => (curr.score > prev.score ? curr : prev), { idx: -1, score: 0 });

  if (bestRing.score > 20) { // Threshold to prefer ring over single number
    return { type: 'ring', index: bestRing.idx };
  }

  // 2. Check individual numbers 14 down to 1
  for (let n = TOTAL_NUMBERS; n >= 1; n--) {
    if (!closed.has(n)) {
      // If we are close to completing, focus on it
      const currentHits = state.hitSequences[n].length;
      if (currentHits >= n - 2) {
        return { type: 'number', index: n };
      }
    }
  }

  // 3. Just pick highest available
  for (let n = TOTAL_NUMBERS; n >= 1; n--) {
    if (!closed.has(n)) {
      return { type: 'number', index: n };
    }
  }

  return { type: 'number', index: 1 }; // Fallback
}
