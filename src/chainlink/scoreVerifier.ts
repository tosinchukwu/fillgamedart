/**
 * @title Filler Game - CRE Score Verifier
 * @notice Verifies game session hits to prevent client-side manipulation.
 * Powered by Chainlink CRE for Convergence Hackathon.
 */

// --- Global Declarations (Chainlink Functions) ---
declare const args: string[];
declare const Functions: {
    encodeString: (val: string) => Uint8Array;
};

// --- Game Logic (Inlined for CRE Compatibility) ---

const TARGET_SCORE = 221.5;
const RING_NUMBERS = {
    0: [14, 13],
    1: [12, 9, 5, 10],
    2: [11, 1, 3, 8],
    3: [7, 4, 2, 6],
};

function calculateHitPoints(state, playerIdx, n) {
    if (n === 1) return { points: 12 };
    const player = state.players[playerIdx];
    const other = state.players[playerIdx === 0 ? 1 : 0];
    const myHits = player.hits[n] || 0;
    const otherHits = other.hits[n] || 0;
    const totalHits = myHits + otherHits;

    let points = 2; // Base Filler
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
        players: [
            { totalScore: 0, hits: {} },
            { totalScore: 0, hits: {} }
        ],
        batch: 1,
        batch1Scores: null,
        winner: null,
        gameOver: false
    };

    hits.forEach(hit => {
        if (state.gameOver) return;
        const player = state.players[hit.player];

        // Simplification for CRE: hit multiple numbers if ring
        const nums = hit.type === 'ring' ? RING_NUMBERS[hit.value] : [hit.value];

        nums.forEach(n => {
            player.hits[n] = (player.hits[n] || 0) + 1;
            const { points } = calculateHitPoints(state, hit.player, n);
            player.totalScore += points;
        });

        // Batch checks
        if (state.batch === 1) {
            if (state.players[0].totalScore > TARGET_SCORE || state.players[1].totalScore > TARGET_SCORE) {
                state.batch = 2;
                state.batch1Scores = [state.players[0].totalScore, state.players[1].totalScore];
                state.players.forEach(p => { p.totalScore = 0; p.hits = {}; });
            }
        } else {
            const p1Target = state.batch1Scores[1];
            const p2Target = state.batch1Scores[0];
            if (state.players[0].totalScore >= p1Target) { state.gameOver = true; state.winner = 0; }
            else if (state.players[1].totalScore >= p2Target) { state.gameOver = true; state.winner = 1; }
        }
    });

    return { winner: state.winner, score0: state.players[0].totalScore, score1: state.players[1].totalScore };
}

// --- CRE Execution ---
const hitHistory = JSON.parse(args[0]);
const verificationResult = replayGame(hitHistory);

// Return the result as a hex string for the smart contract
// @ts-ignore - Chainlink Functions uses top-level return
return Functions.encodeString(JSON.stringify(verificationResult));
