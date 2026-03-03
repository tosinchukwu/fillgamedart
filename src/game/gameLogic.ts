import { TOTAL_NUMBERS, TARGET_SCORE, RING_NUMBERS } from './boardLayout';

export interface PlayerState {
  name: string;
  address: string;
  hits: Record<number, number>; // number -> current hits
  completed: Record<number, boolean>; // number -> completed?
  fillerPoints: number;
  topFillerBonuses: number;
  fillUpBonuses: number;
  totalScore: number;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  currentPlayer: 0 | 1;
  dartsRemaining: number;
  turnHistory: TurnAction[];
  closedNumbers: Set<number>; // fully closed (both completed)
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
  const hits: Record<number, number> = {};
  const completed: Record<number, boolean> = {};
  for (let i = 1; i <= TOTAL_NUMBERS; i++) {
    hits[i] = 0;
    completed[i] = false;
  }
  return { name, address, hits, completed, fillerPoints: 0, topFillerBonuses: 0, fillUpBonuses: 0, totalScore: 0 };
}

export function createInitialGameState(p1Name: string, p1Addr: string, p2Name: string, p2Addr: string, isVsCPU = false): GameState {
  return {
    players: [createInitialPlayer(p1Name, p1Addr), createInitialPlayer(p2Name, p2Addr)],
    currentPlayer: 0,
    dartsRemaining: 3,
    turnHistory: [],
    closedNumbers: new Set(),
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
  const player = gameState.players[playerIdx];
  const opponent = gameState.players[playerIdx === 0 ? 1 : 0];

  let dynamicTopFillerBonuses = 0;

  // Iterate through all numbers to calculate Top Filler Bonus dynamically
  for (let n = 1; n <= TOTAL_NUMBERS; n++) {
    const p1Hits = gameState.players[0].hits[n];
    const p2Hits = gameState.players[1].hits[n];

    // If both have 0 hits, no one gets a bonus
    if (p1Hits === 0 && p2Hits === 0) continue;

    if (p1Hits > p2Hits) {
      if (playerIdx === 0) dynamicTopFillerBonuses += 7;
    } else if (p2Hits > p1Hits) {
      if (playerIdx === 1) dynamicTopFillerBonuses += 7;
    } else {
      // Tie
      dynamicTopFillerBonuses += 3.5;
    }
  }

  return player.fillerPoints + dynamicTopFillerBonuses + player.fillUpBonuses;
}

export function hitNumber(state: GameState, targetNumber: number, isMultiHit = false): { state: GameState; message: string } {
  const newState = structuredClone(state) as GameState;
  newState.closedNumbers = new Set(state.closedNumbers);

  const cp = newState.currentPlayer;
  const player = newState.players[cp];
  const opponent = newState.players[cp === 0 ? 1 : 0];
  let message = '';

  if (newState.closedNumbers.has(targetNumber)) {
    message = `Number ${targetNumber} is closed! No points.`;
  } else if (player.completed[targetNumber]) {
    message = `You already completed ${targetNumber}! No points.`;
  } else {
    player.hits[targetNumber]++;

    // Filler points: 2 per hit while not completed
    if (player.hits[targetNumber] <= targetNumber) {
      player.fillerPoints += 2;
      message = `Hit ${targetNumber}! (${player.hits[targetNumber]}/${targetNumber}) +2 filler pts`;
    }

    // Check completion
    if (player.hits[targetNumber] >= targetNumber && !player.completed[targetNumber]) {
      player.completed[targetNumber] = true;
      message = `🎯 Completed ${targetNumber}!`;

      // Fill-Up Bonus: FIRST to complete gets 10 and closes it
      if (!opponent.completed[targetNumber]) {
        newState.closedNumbers.add(targetNumber);
        player.fillUpBonuses += 10;
        message += ` +10 Fill-Up Bonus! Number closed.`;
      }
    }
  }

  // Update scores using the dynamic calculator
  newState.players[0].totalScore = recalcTotalScore(newState, 0);
  newState.players[1].totalScore = recalcTotalScore(newState, 1);

  if (!isMultiHit) {
    // Dart management
    newState.dartsRemaining--;
    const finalMessage = `[${player.name}]: 🎯 Direct Hit on Number ${targetNumber}! (${message})`;
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
  }

  // Restore proper dart count (ring hit = 1 dart)
  currentState.dartsRemaining = originalDarts - 1;
  const pName = currentState.players[currentState.currentPlayer].name;
  currentState.lastAction = `[${pName}]: ⭕ Direct hit on Ring ${ringIndex + 1}! Affecting: ${ringNumbers.join(', ')}`;

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
        p.fillerPoints = 0;
        p.topFillerBonuses = 0;
        p.fillUpBonuses = 0;
        p.totalScore = 0;
        for (let i = 1; i <= TOTAL_NUMBERS; i++) {
          p.hits[i] = 0;
          p.completed[i] = false;
        }
      });
      state.closedNumbers = new Set();

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

    // Check if both players have finished all numbers (Board closed)
    let allCompleted = true;
    for (let i = 1; i <= TOTAL_NUMBERS; i++) {
      if (!state.players[0].completed[i] || !state.players[1].completed[i]) {
        allCompleted = false;
        break;
      }
    }

    if (allCompleted) {
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
  const cpu = state.players[1];
  const closed = state.closedNumbers;

  // 1. Check rings (Indices 0-3)
  const ringScores = Object.values(RING_NUMBERS).map((nums, idx) => {
    let score = 0;
    nums.forEach(n => {
      if (!closed.has(n) && !cpu.completed[n]) {
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
    if (!closed.has(n) && !cpu.completed[n]) {
      // If we are close to completing, focus on it
      if (cpu.hits[n] >= n - 2) {
        return { type: 'number', index: n };
      }
    }
  }

  // 3. Just pick highest available
  for (let n = TOTAL_NUMBERS; n >= 1; n--) {
    if (!closed.has(n) && !cpu.completed[n]) {
      return { type: 'number', index: n };
    }
  }

  return { type: 'number', index: 1 }; // Fallback
}
