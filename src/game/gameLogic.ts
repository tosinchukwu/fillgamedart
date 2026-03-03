import { TOTAL_NUMBERS, TARGET_SCORE } from './boardLayout';

export interface PlayerState {
  name: string;
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
  gameOver: boolean;
  winner: 0 | 1 | null;
  lastAction: string | null;
}

export interface TurnAction {
  player: 0 | 1;
  target: number | 'ring'; // number hit or ring
  ringIndex?: number;
  pointsEarned: number;
}

export function createInitialPlayer(name: string): PlayerState {
  const hits: Record<number, number> = {};
  const completed: Record<number, boolean> = {};
  for (let i = 1; i <= TOTAL_NUMBERS; i++) {
    hits[i] = 0;
    completed[i] = false;
  }
  return { name, hits, completed, fillerPoints: 0, topFillerBonuses: 0, fillUpBonuses: 0, totalScore: 0 };
}

export function createInitialGameState(p1Name: string, p2Name: string): GameState {
  return {
    players: [createInitialPlayer(p1Name), createInitialPlayer(p2Name)],
    currentPlayer: 0,
    dartsRemaining: 3,
    turnHistory: [],
    closedNumbers: new Set(),
    batch: 1,
    batch1Score: null,
    batch1Winner: null,
    gameOver: false,
    winner: null,
    lastAction: null,
  };
}

function recalcTotalScore(player: PlayerState): number {
  return player.fillerPoints + player.topFillerBonuses + player.fillUpBonuses;
}

export function hitNumber(state: GameState, targetNumber: number): { state: GameState; message: string } {
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

      // Fill-Up Bonus: last to complete gets 10
      if (opponent.completed[targetNumber]) {
        // Both done - close it, current player was last
        newState.closedNumbers.add(targetNumber);
        player.fillUpBonuses += 10;
        message += ` +10 Fill-Up Bonus! Number closed.`;
      } else {
        message += ` Waiting for opponent to close it.`;
      }

      // Check Top Filler Bonus for numbers 2-14
      if (targetNumber >= 2) {
        checkTopFillerBonus(newState, targetNumber);
      }
    }
  }

  // Update scores
  player.totalScore = recalcTotalScore(player);
  opponent.totalScore = recalcTotalScore(opponent);

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

  // Check batch after every hit too
  checkBatchConditions(newState);

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
    const result = hitNumber(currentState, num);
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

function checkTopFillerBonus(state: GameState, num: number) {
  const p1 = state.players[0];
  const p2 = state.players[1];

  // Only award when both have completed the number
  if (!p1.completed[num] || !p2.completed[num]) return;

  const p1Hits = p1.hits[num];
  const p2Hits = p2.hits[num];

  if (p1Hits > p2Hits) {
    p1.topFillerBonuses += 7;
  } else if (p2Hits > p1Hits) {
    p2.topFillerBonuses += 7;
  } else {
    p1.topFillerBonuses += 3.5;
    p2.topFillerBonuses += 3.5;
  }
}

function checkBatchConditions(state: GameState) {
  const p1Score = recalcTotalScore(state.players[0]);
  const p2Score = recalcTotalScore(state.players[1]);

  if (state.batch === 1) {
    if (p1Score >= TARGET_SCORE || p2Score >= TARGET_SCORE) {
      const b1w = p1Score >= TARGET_SCORE ? 0 : 1;
      const benchmark = b1w === 0 ? p1Score : p2Score;

      state.batch = 2;
      state.batch1Winner = b1w;
      state.batch1Score = benchmark; // Set the dynamic benchmark (The Bar)

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
  } else if (state.batch === 2 && state.batch1Winner !== null) {
    const b1w = state.batch1Winner;
    const opponentIdx = 1 - b1w;
    const opponentScore = recalcTotalScore(state.players[opponentIdx]);
    const benchmark = state.batch1Score!;

    // Opponent wins if they surpass the benchmark
    if (opponentScore > benchmark) {
      state.gameOver = true;
      state.winner = opponentIdx as (0 | 1);
      state.lastAction = `[SYSTEM]: 🏆 ${state.players[opponentIdx].name} surpassed the Benchmark of ${benchmark} and WINS!`;
    } else {
      // Check if opponent has finished all numbers but failed to beat the benchmark
      const allCompleted = Object.values(state.players[opponentIdx].completed).every(v => v === true);
      // Also consider if they have no more darts and no more potential to score? 
      // Simplified: if both players completed all numbers (board closed), and opponent is still lower.
      if (allCompleted && opponentScore <= benchmark) {
        state.gameOver = true;
        state.winner = b1w;
      }
    }
  }
}
