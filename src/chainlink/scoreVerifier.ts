// @ts-nocheck
const TARGET_SCORE = 221.5;
const RING_NUMBERS = { 0: [14, 13], 1: [12, 9, 5, 10], 2: [11, 1, 3, 8], 3: [7, 4, 2, 6] };

function calculateHitPoints(state, playerIdx, n) {
    if (n === 1) return { points: 12 };
    const player = state.players[playerIdx];
    const other = state.players[playerIdx === 0 ? 1 : 0];
    const myHits = player.hits[n] || 0;
    const otherHits = other.hits[n] || 0;
    const totalHits = myHits + otherHits;
    let points = 2;
    const threshold = n / 2;
    const prevMyHits = myHits - 1;
    const prevOtherHits = otherHits;
    if (myHits > threshold || otherHits > threshold) {
        const prevTriggered = prevMyHits > threshold || prevOtherHits > threshold;
        if (!prevTriggered) {
            if (myHits > otherHits) points += 7;
        } else {
            if (prevMyHits < prevOtherHits && myHits === prevOtherHits) {
                points += 3.5;
                other.totalScore -= 3.5;
            } else if (prevMyHits === prevOtherHits && myHits > prevOtherHits) {
                points += 3.5;
                other.totalScore -= 3.5;
            }
        }
    }
    if (totalHits >= n) points += 10;
    return { points };
}

function replayGame(hits) {
    const state = {
        players: [{ totalScore: 0, hits: {}, completed: {} }, { totalScore: 0, hits: {}, completed: {} }],
        closedNumbers: {},
        batch: 1, batch1Scores: null, winner: null, gameOver: false
    };

    hits.forEach(hit => {
        if (state.gameOver) return;
        const cp = hit.player;
        const player = state.players[cp];
        const other = state.players[1 - cp];
        const nums = hit.type === 'ring' ? RING_NUMBERS[hit.value] : [hit.value];

        nums.forEach(n => {
            if (state.closedNumbers[n]) return;

            player.hits[n] = (player.hits[n] || 0) + 1;
            const { points } = calculateHitPoints(state, cp, n);
            player.totalScore += points;

            if (n === 1 || (player.hits[n] + (other.hits[n] || 0)) >= n) {
                state.closedNumbers[n] = true;
                player.completed[n] = true;
            }
        });

        if (state.batch === 1) {
            const p1S = state.players[0].totalScore;
            const p2S = state.players[1].totalScore;
            const allClosed = Object.keys(state.closedNumbers).length === 14;

            if (p1S > TARGET_SCORE || p2S > TARGET_SCORE || allClosed) {
                state.batch = 2;
                state.batch1Scores = [p1S, p2S];
                state.players.forEach(p => {
                    p.totalScore = 0;
                    p.hits = {};
                    p.completed = {};
                });
                state.closedNumbers = {};
            }
        } else {
            const p1Target = state.batch1Scores[1];
            const p2Target = state.batch1Scores[0];
            if (state.players[0].totalScore >= p1Target) {
                state.gameOver = true;
                state.winner = 0;
            } else if (state.players[1].totalScore >= p2Target) {
                state.gameOver = true;
                state.winner = 1;
            }
        }
    });

    return {
        winner: state.winner,
        score0: state.players[0].totalScore,
        score1: state.players[1].totalScore
    };
}

const hitHistory = JSON.parse(args[0]);
const result = replayGame(hitHistory);

// Pack results into a single uint256 to save LINK and gas:
// [248-255]: winner (8 bits: 0 or 1, or 255 if none)
// [128-159]: score0 * 10 (32 bits)
// [0-31]: score1 * 10 (32 bits)

const winnerVal = result.winner === null ? 255 : result.winner;
const s0 = Math.floor(result.score0 * 10);
const s1 = Math.floor(result.score1 * 10);

const packed = (BigInt(winnerVal) << BigInt(248)) |
    (BigInt(s0) << BigInt(128)) |
    BigInt(s1);

return Functions.encodeUint256(packed);
