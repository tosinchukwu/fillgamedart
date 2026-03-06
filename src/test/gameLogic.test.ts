import { describe, it, expect } from "vitest";
import { createInitialGameState, hitNumber, hitRing } from "../game/gameLogic";
import { RING_NUMBERS } from "../game/boardLayout";

describe("Game Logic Per-Number Bonus Tests (New Rules)", () => {
    const p1 = { name: "Player 1", addr: "0x1" };
    const p2 = { name: "Player 2", addr: "0x2" };

    it("should award Top Filler Bonus only after trigger threshold (> n/2)", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // n=4. Trigger threshold = 4/2 = 2.
        // TFB awarded when someone has > 2 hits (i.e., at least 3 hits).

        // Hit 1: P0 hits #4. Hits: P0=1, P1=0. (1 <= 2, no TFB)
        // Score: +2 (Filler) + 0 (Pre-threshold) = 2.
        state = hitNumber(state, 4, true).state;
        expect(state.players[0].totalScore).toBe(2);

        // Hit 2: P0 hits #4. Hits: P0=2, P1=0. (2 <= 2, no TFB)
        // Score: 2 + 2 (Filler) + 0 (Pre-threshold) = 4.
        state = hitNumber(state, 4, true).state;
        expect(state.players[0].totalScore).toBe(4);

        // Hit 3: P0 hits #4. Hits: P0=3, P1=0. (3 > 2, TRIGGERED!)
        // Score: 4 + 2 (Filler) + 7 (Lead) = 13.
        state = hitNumber(state, 4, true).state;
        expect(state.players[0].totalScore).toBe(13);

        // Hit 4: P1 hits #4. Hits: P0=3, P1=1. (TFB triggered by P0=3)
        // P1 Score: +2 (Filler) + 0 (Trailing TFB) + 10 (Fill-Up Closure) = 12.
        state.currentPlayer = 1;
        state = hitNumber(state, 4, true).state;
        expect(state.players[1].totalScore).toBe(12);
    });

    it("should follow the user's Number 12 example Lead Scoring", () => {
        const state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);
        // Number 12: A,A,B,B,A,A,A,A(A) -> 9th hit by A
        // A hits: 1, 2, 5, 6, 7, 8, 9 (7 hits)
        // B hits: 3, 4 (2 hits)
        // On 9th hit (by A): A has 6 hits, B has 2 hits. 6 > 2.
        // Score: +2 (Filler) + 7 (Lead) = 9.

        // Setup sequence manually to skip 8 hits
        const p1Idx = 0;
        const p2Idx = 1;
        state.players[p1Idx].hits[12] = 6;
        state.players[p2Idx].hits[12] = 2;

        const result = hitNumber(state, 12, true);
        // Hit #9 by A. A lead (7 vs 2). +9 pts.
        expect(result.state.players[p1Idx].totalScore).toBe(9);
    });

    it("should follow the user's Number 9 example Trailing Scoring", () => {
        const state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);
        // Number 9: B,B,B,A,A,B,B,A(A) -> 9th hit by A
        // B hits: 1, 2, 3, 6, 7 (5 hits)
        // A hits: 4, 5, 8, 9 (4 hits)
        // On 9th hit (by A): A has 4 hits, B has 5 hits. 4 < 5.
        // Score: +2 (Filler) + 10 (Fill-Up hit #9) + 0 (Trailing) = 12.

        const p1Idx = 0;
        const p2Idx = 1;
        state.players[p2Idx].hits[9] = 5;
        state.players[p1Idx].hits[9] = 3;

        state.currentPlayer = 0;
        const result = hitNumber(state, 9, true);
        expect(result.state.players[p1Idx].totalScore).toBe(12);
    });

    it("should award Number 1 fixed bonus of 12 pts", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);
        state = hitNumber(state, 1, true).state;
        expect(state.players[0].totalScore).toBe(12);

        // Second hit on 1 should be blocked/0
        state = hitNumber(state, 1, true).state;
        expect(state.players[0].totalScore).toBe(12);
    });
});
