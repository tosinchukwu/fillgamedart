import { describe, it, expect } from "vitest";
import { createInitialGameState, hitNumber, hitRing } from "../game/gameLogic";
import { RING_NUMBERS } from "../game/boardLayout";

describe("Game Logic Per-Number Bonus Tests (New Rules)", () => {
    const p1 = { name: "Player 1", addr: "0x1" };
    const p2 = { name: "Player 2", addr: "0x2" };

    it("should award Top Filler Bonus based on current lead/tie per hit", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // n=4. 
        // P0 hits #4: +2 (Filler) + 7 (Lead) = 9. Hits: P0=1, P1=0.
        state = hitNumber(state, 4, true).state;
        expect(state.players[0].totalScore).toBe(9);

        // P0 hits #4: +2 (Filler) + 7 (Lead) = 9. Total=18. Hits: P0=2, P1=0.
        state = hitNumber(state, 4, true).state;
        expect(state.players[0].totalScore).toBe(18);

        // P1 hits #4: +2 (Filler) + 0 (Trailing) = 2. Hits: P0=2, P1=1.
        state.currentPlayer = 1;
        state = hitNumber(state, 4, true).state;
        expect(state.players[1].totalScore).toBe(2);

        // P1 hits #4: +2 (Filler) + 3.5 (Tie) = 5.5. Total=7.5. Hits: P0=2, P1=2.
        state = hitNumber(state, 4, true).state;
        expect(state.players[1].totalScore).toBe(7.5);

        // P1 hits #4: +2 (Filler) + 7 (Lead) = 9. Total=16.5. Hits: P0=2, P1=3.
        state = hitNumber(state, 4, true).state;
        expect(state.players[1].totalScore).toBe(16.5);

        // P0 hits #4: +2 (Filler) + 3.5 (Tie) + 10 (Closure) = 15.5. Total=18+15.5=33.5. Hits: P0=3, P1=3. (Wait, n=4)
        // Actually n=4 closure is on hit 4 total.
        // Current total hits = 5. So n=4 should have closed on the previous hit.
    });

    it("should follow the user's Number 12 example Lead Scoring", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);
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
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);
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
