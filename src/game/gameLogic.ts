import { TOTAL_NUMBERS, TARGET_SCORE, RING_NUMBERS } from './boardLayout';

export interface PlayerState {
  name: string;
  address: string;
  totalScore: number;
  hits: Record<number, number>;
  completed: Record<number, boolean>;
  bonusPoints: Record<number, number>;
  num1AwardedBatch1: boolean;
  num1AwardedBatch2: boolean;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  currentPlayer: 0 | 1;
  dartsRemaining: number;
  turnHistory: TurnAction[];
  closedNumbers: Set<number>;
  hitSequences: Record<number, (0 | 1)[]>;
  batch: 1 | 2;
  batch1Score: number | null;
  batch1Winner: 0 | 1 | null;
  batch1Scores: [number, number] | null;
  gameOver: boolean;
  winner: 0 | 1 | null;
  lastAction: string | null;
  logMessages: string[];
  isVsCPU: boolean;
}

export interface TurnAction {
  player: 0 | 1;
  target: number | 'ring';
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
    logMessages: [],
    isVsCPU,
  };
}

function calculateHitPoints(state: GameState, playerIdx: 0 | 1, n: number): { points: number; breakdown: string } {
  if (n === 1) {
    // Number 1 specialized rule: +2 Filler + 10 Fill-Up = 12 total.
    return { points: 12, breakdown: "+2 Filler +10 Fill-Up" };
  }

  const player = state.players[playerIdx];
  const other = state.players[playerIdx === 0 ? 1 : 0];
  const myHits = player.hits[n];
  const otherHits = other.hits[n];
  const totalHits = myHits + otherHits;

  let points = 2; // Base Filler
  let breakdown = "+2 Filler";

  // Top Filler with Sharing Logic (Trigger: At least one player must have more than 50% hits)
  const triggerThreshold = n / 2;
  const isTriggered = myHits > triggerThreshold || otherHits > triggerThreshold;

  if (isTriggered) {
    if (myHits > otherHits) {
      points += 7;
      breakdown += " +7 Top-Filler (Lead)";
    } else if (myHits === otherHits) {
      points += 3.5;
      breakdown += " +3.5 Top-Filler (Tie)";
      // Sharing Rule: If we reach a tie, we split the opponent's previous lead bonus
      other.totalScore -= 3.5;
      breakdown += " (Opponent bonus shared -3.5)";
    } else {
      breakdown += " +0 Top-Filler (Trailing)";
    }
  } else {
    breakdown += " +0 Top-Filler (Pre-threshold)";
  }

  // Fill-Up
  if (totalHits >= n) {
    points += 10;
    breakdown += " +10 Fill-Up";
  }

  return { points, breakdown };
}

export function hitNumber(state: GameState, targetNumber: number, isMultiHit = false): { state: GameState; message: string } {
  const newState = structuredClone(state) as GameState;
  const cp = newState.currentPlayer;
  const player = newState.players[cp];
  const other = newState.players[cp === 0 ? 1 : 0];
  let message = '';

  if (!isMultiHit) newState.dartsRemaining--;

  const totalHitsBefore = (player.hits[targetNumber] || 0) + (other.hits[targetNumber] || 0);

  if (newState.closedNumbers.has(targetNumber) || totalHitsBefore >= targetNumber) {
    message = `Number ${targetNumber} is already closed.`;
  } else {
    // Record the hit
    player.hits[targetNumber] = (player.hits[targetNumber] || 0) + 1;
    newState.hitSequences[targetNumber].push(cp);

    // Calculate points for THIS hit
    const { points, breakdown } = calculateHitPoints(newState, cp, targetNumber);
    player.totalScore += points;

    const currentTotalHits = player.hits[targetNumber] + other.hits[targetNumber];

    if (targetNumber === 1 || currentTotalHits >= targetNumber) {
      newState.closedNumbers.add(targetNumber);
      player.completed[targetNumber] = true;
      message = `Hit #${targetNumber}! ${breakdown}. ${targetNumber === 1 ? 'Closed!' : 'Fully closed!'}`;
    } else {
      message = `Hit ${targetNumber}! ${breakdown}. (${currentTotalHits}/${targetNumber})`;
    }
  }

  const finalScore = player.totalScore;
  newState.lastAction = `[${player.name}]: 🎯 Dart landed on ${targetNumber}! (${message}) [Total: ${finalScore} pts]`;

  if (!isMultiHit) {
    newState.logMessages.push(newState.lastAction);
  }

  if (!isMultiHit && newState.dartsRemaining <= 0) {
    checkBatchConditions(newState);
    if (!newState.gameOver && newState.dartsRemaining === 0) {
      newState.currentPlayer = cp === 0 ? 1 : 0;
      newState.dartsRemaining = 3;
    }
  }

  return { state: newState, message };
}

export function hitRing(state: GameState, ringIndex: number, ringNumbers: number[]): { state: GameState; messages: string[] } {
  // Ring hits now count as direct hits for EVERY number in the group
  let currentResult = { state, message: '' };
  const messages: string[] = [];

  // Decrement dart once for the ring hit
  const baseState = structuredClone(state) as GameState;
  baseState.dartsRemaining--;
  currentResult.state = baseState;

  for (const num of ringNumbers) {
    const result = hitNumber(currentResult.state, num, true);
    currentResult = { state: result.state, message: result.message };
    messages.push(result.message);
  }

  const cp = currentResult.state.currentPlayer;
  const player = currentResult.state.players[cp];
  const numsJoined = ringNumbers.join(', ');
  currentResult.state.lastAction = `[${player.name}]: ⭕ Direct hit on Ring ${ringIndex + 1}! (${numsJoined}) = Total: ${player.totalScore} pts`;
  currentResult.state.logMessages.push(currentResult.state.lastAction);

  if (currentResult.state.dartsRemaining <= 0) {
    checkBatchConditions(currentResult.state);
    if (!currentResult.state.gameOver && currentResult.state.dartsRemaining === 0) {
      currentResult.state.currentPlayer = cp === 0 ? 1 : 0;
      currentResult.state.dartsRemaining = 3;
    }
  }

  return { state: currentResult.state, messages };
}

function checkBatchConditions(state: GameState) {
  const p1Score = state.players[0].totalScore;
  const p2Score = state.players[1].totalScore;

  if (state.batch === 1) {
    if (p1Score > TARGET_SCORE || p2Score > TARGET_SCORE) {
      const b1w = p1Score > TARGET_SCORE ? 0 : 1;
      const benchmark = b1w === 0 ? p1Score : p2Score;

      state.batch = 2;
      state.batch1Winner = b1w;
      state.batch1Score = benchmark;
      state.batch1Scores = [p1Score, p2Score];

      state.players.forEach(p => {
        p.totalScore = 0;
        for (let i = 1; i <= TOTAL_NUMBERS; i++) {
          p.hits[i] = 0;
          p.completed[i] = false;
          p.bonusPoints[i] = 0;
        }
        p.num1AwardedBatch1 = false;
      });
      state.closedNumbers = new Set();
      for (let i = 1; i <= TOTAL_NUMBERS; i++) {
        state.hitSequences[i] = [];
      }

      state.currentPlayer = (1 - b1w) as (0 | 1);
      state.dartsRemaining = 3;
      state.lastAction = `[SYSTEM]: 🚀 ${state.players[b1w].name} set the Bar at ${benchmark}! BATCH 2 START. ${state.players[1 - b1w].name}'s turn to beat it!`;
      state.logMessages.push(state.lastAction);
    }
  } else if (state.batch === 2 && state.batch1Scores !== null) {
    const [p1Target, p2Target] = [state.batch1Scores[1], state.batch1Scores[0]];

    if (p1Score >= p1Target) {
      state.gameOver = true;
      state.winner = 0;
      state.lastAction = `[SYSTEM]: 🏆 ${state.players[0].name} reached the target of ${p1Target} and WINS!`;
      state.logMessages.push(state.lastAction);
    } else if (p2Score >= p2Target) {
      state.gameOver = true;
      state.winner = 1;
      state.lastAction = `[SYSTEM]: 🏆 ${state.players[1].name} reached the target of ${p2Target} and WINS!`;
      state.logMessages.push(state.lastAction);
    }
  }
}

export function computeCPUMove(state: GameState): { type: 'number' | 'ring'; index: number } {
  const cpuIdx = 1;
  const player = state.players[cpuIdx];
  const closed = state.closedNumbers;

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

  for (let n = TOTAL_NUMBERS; n >= 1; n--) {
    if (!closed.has(n)) return { type: 'number', index: n };
  }

  return { type: 'number', index: 1 };
}
