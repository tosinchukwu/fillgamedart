import { TOTAL_NUMBERS, TARGET_SCORE, RING_NUMBERS } from './boardLayout';

export interface PlayerState {
  name: string;
  address: string;
  totalScore: number;
  hits: Record<number, number>;
  completed: Record<number, boolean>;
  bonusPoints: Record<number, number>; // Points from rings that don't count as hits
  num1AwardedBatch1: boolean;
  num1AwardedBatch2: boolean;
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
  const bonusPoints: Record<number, number> = {};
  for (let i = 1; i <= TOTAL_NUMBERS; i++) {
    hits[i] = 0;
    completed[i] = false;
    bonusPoints[i] = 0;
  }
  return {
    name,
    address,
    totalScore: 0,
    hits,
    completed,
    bonusPoints,
    num1AwardedBatch1: false,
    num1AwardedBatch2: false
  };
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
  const opponent = gameState.players[1 - playerIdx];

  for (let n = 1; n <= TOTAL_NUMBERS; n++) {
    // 1. Filler Points (+2 per hit, capped at number's value)
    // COMBINED with bonus points from rings, but still capped at n * 2
    // 1. Filler points (+2 per hit)
    // Capped at n*2 EXCEPT for Number 1 which is capped at ONE hit per batch
    const baseFiller = n === 1 ? (player.hits[1] > 0 ? 2 : 0) : player.hits[n] * 2;
    const bonus = player.bonusPoints[n];
    const totalFiller = n === 1 ? baseFiller : Math.min(baseFiller + bonus, n * 2);
    score += totalFiller;

    // 2. Top Filler Bonus (+7 per number, split if tied)
    // Awarded based on contribution share when the number is CLOSED
    // Majority contributor (> N/2 hits) gets +7. Equal contribution (N/2 each) gets +3.5.
    if (n >= 2 && gameState.closedNumbers.has(n)) {
      const pHits = player.hits[n];
      const threshold = n / 2;

      if (pHits > threshold) {
        score += 7;
      } else if (pHits > 0 && pHits === threshold) {
        score += 3.5;
      }
    }

    // 3. Fill-Up Bonus (+10 per number)
    // For Number 1: Awarded ONLY ONCE per batch (+10 pts)
    // For others: Awarded to the player who landings the final hit to close the number for BOTH players
    if (n === 1) {
      if (player.num1AwardedBatch1) score += 10;
      if (player.num1AwardedBatch2) score += 10;
    } else if (gameState.closedNumbers.has(n)) {
      const seq = gameState.hitSequences[n];
      if (seq.length >= n) {
        const closingPlayerIdx = seq[n - 1]; // The player who landed the Nth hit
        if (closingPlayerIdx === playerIdx) {
          score += 10;
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

  // 1. Record hit
  player.hits[targetNumber]++;
  newState.hitSequences[targetNumber].push(cp);

  if (targetNumber === 1) {
    if (newState.batch === 1) player.num1AwardedBatch1 = true;
    else if (newState.batch === 2) player.num1AwardedBatch2 = true;
    // Special rule: Number 1 closes for everyone after any 1 player hits it once in that batch
    newState.closedNumbers.add(1);
  }

  // SHARED COMPLETION CHECK:
  const totalBoardHits = newState.players[0].hits[targetNumber] + newState.players[1].hits[targetNumber];
  if (totalBoardHits >= targetNumber) {
    newState.closedNumbers.add(targetNumber);
  }

  // Update player's personal completion status
  if (player.hits[targetNumber] >= targetNumber) {
    player.completed[targetNumber] = true;
  }

  if (newState.closedNumbers.has(targetNumber)) {
    message = `Number ${targetNumber} is fully closed!`;
    if (targetNumber !== 1) { // Number 1 fill-up bonus is handled by num1AwardedBatchX flags
      const seq = newState.hitSequences[targetNumber];
      if (seq.length >= targetNumber) {
        const closingPlayerIdx = seq[targetNumber - 1];
        if (closingPlayerIdx === cp) {
          message += " +10 Fill-Up Bonus awarded!";
        }
      }
    }
  } else {
    message = `Hit ${targetNumber}! (${player.hits[targetNumber]}/${targetNumber})`;
    if (player.completed[targetNumber]) {
      message += ` Personal Completion reached!`;
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
  const newState = structuredClone(state) as GameState;
  const cp = newState.currentPlayer;
  const player = newState.players[cp];
  const oldScore = player.totalScore;

  // Process each number in the ring as a "hit"
  for (const num of ringNumbers) {
    if (newState.closedNumbers.has(num)) continue;

    // 1. Record hit (similar to  // 1. Record hit
    player.hits[num]++;
    newState.hitSequences[num].push(cp);

    if (num === 1) {
      if (newState.batch === 1) player.num1AwardedBatch1 = true;
      else if (newState.batch === 2) player.num1AwardedBatch2 = true;
      newState.closedNumbers.add(1);
    }

    // SHARED COMPLETION CHECK:
    const totalBoardHits = newState.players[0].hits[num] + newState.players[1].hits[num];
    if (totalBoardHits >= num) {
      newState.closedNumbers.add(num);
    }
    // Update player's personal completion status
    if (player.hits[num] >= num) {
      player.completed[num] = true;
    }
  }

  // Update scores for both players
  newState.players[0].totalScore = recalcTotalScore(newState, 0);
  newState.players[1].totalScore = recalcTotalScore(newState, 1);

  // Calculate points gained in this specific hit
  const pointsEarnedInHit = player.totalScore - oldScore;

  newState.dartsRemaining--;
  newState.lastAction = `[${player.name}]: ⭕ Direct hit on Ring ${ringIndex + 1}! (${ringNumbers.join(', ')}) = Total: ${pointsEarnedInHit} pts`;

  // Turn management
  if (newState.dartsRemaining <= 0) {
    if (!newState.gameOver) {
      newState.currentPlayer = cp === 0 ? 1 : 0;
      newState.dartsRemaining = 3;
    }
  }

  // Final check for win conditions
  checkBatchConditions(newState);

  return { state: newState, messages: [] };
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
          p.bonusPoints[i] = 0;
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
