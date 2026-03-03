import { TOTAL_NUMBERS, TARGET_SCORE, RING_NUMBERS } from './boardLayout';

export interface PlayerState {
  name: string;
  address: string;
  totalScore: number;
  hits: Record<number, number>;
  completed: Record<number, boolean>;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  currentPlayer: 0 | 1;
  dartsRemaining: number;
  turnHistory: TurnAction[];
  closedNumbers: Set<number>; // fully closed (both players completed)
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
  const hits: Record<number, number> = {};
  const completed: Record<number, boolean> = {};
  for (let i = 1; i <= TOTAL_NUMBERS; i++) {
    hits[i] = 0;
    completed[i] = false;
  }
  return { name, address, totalScore: 0, hits, completed };
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
  const player = gameState.players[playerIdx];

  // 1. Filler Points (+2 per hit, capped at number's value)
  for (let n = 1; n <= TOTAL_NUMBERS; n++) {
    const hits = player.hits[n];
    score += hits * 2;
  }

  // 2. Top Filler Bonus (+7 total, split if tied)
  // Most total hits on 2–14
  let p1TotalHits = 0;
  let p2TotalHits = 0;
  for (let n = 2; n <= TOTAL_NUMBERS; n++) {
    p1TotalHits += gameState.players[0].hits[n];
    p2TotalHits += gameState.players[1].hits[n];
  }

  if (p1TotalHits > p2TotalHits) {
    if (playerIdx === 0) score += 7;
  } else if (p2TotalHits > p1TotalHits) {
    if (playerIdx === 1) score += 7;
  } else if (p1TotalHits > 0) { // Tie > 0
    score += 3.5;
  }

  // 3. Fill-Up Bonus (+10 per number)
  // Awarded to the player who landings the final hit to close the number for BOTH players
  for (let n = 1; n <= TOTAL_NUMBERS; n++) {
    const seq = gameState.hitSequences[n];
    if (gameState.closedNumbers.has(n)) {
      // Find who landed the closing hit
      // A number is closed when both have completed it.
      // We need to find the index where the second person completed it.
      let p1Remaining = n;
      let p2Remaining = n;
      for (let i = 0; i < seq.length; i++) {
        const p = seq[i];
        if (p === 0) p1Remaining--;
        else p2Remaining--;

        if (p1Remaining <= 0 && p2Remaining <= 0) {
          if (p === playerIdx) score += 10;
          break;
        }
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
    message = `Number ${targetNumber} is closed for both! No points.`;
  } else if (player.completed[targetNumber]) {
    message = `You already completed ${targetNumber}. Waiting for opponent.`;
    // We still record the hit for sequence but it won't award points in recalc (since it's capped)
    newState.hitSequences[targetNumber].push(cp);
  } else {
    // Record hit
    player.hits[targetNumber]++;
    newState.hitSequences[targetNumber].push(cp);

    if (player.hits[targetNumber] >= targetNumber) {
      player.completed[targetNumber] = true;
      message = `Hit ${targetNumber}! Completed!`;

      // Check if this fully closes the board
      const opponent = newState.players[1 - cp];
      if (opponent.completed[targetNumber]) {
        newState.closedNumbers.add(targetNumber);
        message += " Board closed for this number! +10 Fill-Up Bonus!";
      }
    } else {
      message = `Hit ${targetNumber}! (${player.hits[targetNumber]}/${targetNumber}) +2 filler pts`;
    }
  }

  // Update scores
  newState.players[0].totalScore = recalcTotalScore(newState, 0);
  newState.players[1].totalScore = recalcTotalScore(newState, 1);

  if (!isMultiHit) {
    newState.dartsRemaining--;
    const totalScore = newState.players[cp].totalScore;
    const finalMessage = `[${player.name}]: 🎯 Direct Hit on Number ${targetNumber}! (${message}) [Total: ${totalScore} pts]`;
    newState.lastAction = finalMessage;

    // IMMEDIATE BATCH 1 CHECK
    if (newState.batch === 1 && totalScore >= TARGET_SCORE) {
      checkBatchConditions(newState);
      return { state: newState, message };
    }

    // Turn management
    if (newState.dartsRemaining <= 0) {
      if (!newState.gameOver) {
        newState.currentPlayer = cp === 0 ? 1 : 0;
        newState.dartsRemaining = 3;
      }
    }

    // Final check for win conditions (Batch 2 immediate win)
    checkBatchConditions(newState);
  }

  return { state: newState, message };
}

export function hitRing(state: GameState, ringIndex: number, ringNumbers: number[]): { state: GameState; messages: string[] } {
  let currentState = structuredClone(state) as GameState;
  currentState.closedNumbers = new Set(state.closedNumbers);
  const messages: string[] = [];

  const originalDarts = currentState.dartsRemaining;
  currentState.dartsRemaining = 999;

  for (const num of ringNumbers) {
    const result = hitNumber(currentState, num, true);
    currentState = result.state;
    currentState.closedNumbers = new Set(currentState.closedNumbers);
    messages.push(result.message);

    // Immediate Win/Batch check during ring hits
    checkBatchConditions(currentState);
    if (currentState.gameOver || (currentState.batch === 2 && state.batch === 1)) break;
  }

  if (currentState.gameOver || (currentState.batch === 2 && state.batch === 1)) {
    // If we transition or game ends, we stop here
    return { state: currentState, messages };
  }

  currentState.dartsRemaining = originalDarts - 1;
  const cp = currentState.currentPlayer;
  const totalScore = currentState.players[cp].totalScore;
  const pName = currentState.players[cp].name;

  currentState.lastAction = `[${pName}]: ⭕ Direct hit on Ring ${ringIndex + 1}! Affecting: ${ringNumbers.join(', ')} [Total: ${totalScore} pts]`;

  if (currentState.dartsRemaining <= 0) {
    if (!currentState.gameOver) {
      currentState.currentPlayer = currentState.currentPlayer === 0 ? 1 : 0;
      currentState.dartsRemaining = 3;
    }
  }

  checkBatchConditions(currentState);

  return { state: currentState, messages };
}

function checkBatchConditions(state: GameState) {
  const p1Score = state.players[0].totalScore;
  const p2Score = state.players[1].totalScore;

  if (state.batch === 1) {
    if (p1Score >= TARGET_SCORE || p2Score >= TARGET_SCORE) {
      const b1w = p1Score >= TARGET_SCORE ? 0 : 1;
      const benchmark = b1w === 0 ? p1Score : p2Score;

      state.batch = 2;
      state.batch1Winner = b1w;
      state.batch1Score = benchmark;
      state.batch1Scores = [p1Score, p2Score];

      // Reset Board and Scores for Batch 2
      state.players.forEach(p => {
        p.totalScore = 0;
        for (let i = 1; i <= TOTAL_NUMBERS; i++) {
          p.hits[i] = 0;
          p.completed[i] = false;
        }
      });
      state.closedNumbers = new Set();
      for (let i = 1; i <= TOTAL_NUMBERS; i++) {
        state.hitSequences[i] = [];
      }

      state.currentPlayer = (1 - b1w) as (0 | 1);
      state.dartsRemaining = 3;
      state.lastAction = `[SYSTEM]: 🚀 ${state.players[b1w].name} set the Bar at ${benchmark}! BATCH 2 START. ${state.players[1 - b1w].name}'s turn to beat it!`;
    }
  } else if (state.batch === 2 && state.batch1Scores !== null) {
    const [p1Target, p2Target] = [state.batch1Scores[1], state.batch1Scores[0]]; // P1 targets P2's score, vice versa

    if (p1Score > p1Target) {
      state.gameOver = true;
      state.winner = 0;
      state.lastAction = `[SYSTEM]: 🏆 ${state.players[0].name} surpassed the target of ${p1Target} and WINS!`;
    } else if (p2Score > p2Target) {
      state.gameOver = true;
      state.winner = 1;
      state.lastAction = `[SYSTEM]: 🏆 ${state.players[1].name} surpassed the target of ${p2Target} and WINS!`;
    }
  }
}

export function computeCPUMove(state: GameState): { type: 'number' | 'ring'; index: number } {
  const cpuIdx = 1;
  const player = state.players[cpuIdx];
  const closed = state.closedNumbers;

  // CPU strategy: Focus on uncompleted high numbers or rings
  const ringScores = Object.values(RING_NUMBERS).map((nums, idx) => {
    let score = 0;
    nums.forEach(n => {
      if (!player.completed[n] && !closed.has(n)) {
        score += n;
      }
    });
    return { idx, score };
  });

  const bestRing = ringScores.reduce((prev, curr) => (curr.score > prev.score ? curr : prev), { idx: -1, score: 0 });

  if (bestRing.score > 20) {
    return { type: 'ring', index: bestRing.idx };
  }

  for (let n = TOTAL_NUMBERS; n >= 1; n--) {
    if (!player.completed[n] && !closed.has(n)) {
      return { type: 'number', index: n };
    }
  }

  // Backup: just hit whatever isn't closed
  for (let n = TOTAL_NUMBERS; n >= 1; n--) {
    if (!closed.has(n)) return { type: 'number', index: n };
  }

  return { type: 'number', index: 1 };
}
