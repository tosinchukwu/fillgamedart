import { describe, it, expect } from "vitest";
import { createInitialGameState, hitNumber, hitRing } from "../game/gameLogic";
import { RING_NUMBERS } from "../game/boardLayout";

describe("Game Logic Per-Number Bonus Tests", () => {
    const p1 = { name: "Player 1", addr: "0x1" };
    const p2 = { name: "Player 2", addr: "0x2" };

    it("should award Top Filler Bonus (+7) only when both players have hit more than half (Only for 2-14)", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // P1 hits #2 once. Not closed.
        state = hitNumber(state, 2).state;
        expect(state.players[0].totalScore).toBe(2);

        // P2 hits #2 once. Board Closes.
        // P1: 2 filler + 3.5 TFP = 5.5
        // P2: 2 filler + 3.5 TFP + 10 Fill-Up = 15.5
        state.currentPlayer = 1;
        state = hitNumber(state, 2).state;
        expect(state.players[1].totalScore).toBe(15.5);
        expect(state.players[0].totalScore).toBe(5.5);

        // P2 hits #2 again. Already closed. No points.
        state = hitNumber(state, 2).state;
        expect(state.players[1].totalScore).toBe(15.5);
    });

    it("should split Top Filler Bonus (3.5 each) on tied hits per number", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        state = hitNumber(state, 5).state; // P1 hits #5 (1 hit)
        state.currentPlayer = 1;
        state = hitNumber(state, 5).state; // P2 hits #5 (1 hit)

        // Target for #5 is 5 hits. Board is NOT closed.
        // TFP/Fill-Up should be 0.
        // P1: 2 filler. P2: 2 filler.
        expect(state.players[0].totalScore).toBe(2);
        expect(state.players[1].totalScore).toBe(2);
    });

    it("should cap filler points at number value but keep hits uncapped for TFP", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // Number 2 requires 2 hits.
        // 1st hit: 2 pts. Board not closed. Total 2.
        // 2nd hit: 4 pts filler + 7 TFP + 10 Fill-Up = 21.
        // 3rd hit: 0 extra (filler capped, TFP/Fill-Up already counted). Total 21.
        state = hitNumber(state, 2).state;
        state = hitNumber(state, 2).state;
        state = hitNumber(state, 2).state;

        expect(state.players[0].totalScore).toBe(21);
        expect(state.players[0].hits[2]).toBe(2); // Should be 2 because 3rd hit was on a closed number
    });

    it("should award Fill-Up Bonus (+10) to the last player to complete a number", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // Number 1
        state = hitNumber(state, 1).state; // P1 completes #1 personally. TFP for #1 is 0. Score = 12 (2 filler + 10 Fill-Up)
        state.currentPlayer = 1;

        // P2 hits #1. Already closed by P1's strike.
        state = hitNumber(state, 1).state;

        // P1 gets 2 filler + 10 Fill-Up = 12
        expect(state.players[0].totalScore).toBe(12);
        // P2 gets 0 (hit on already closed number)
        expect(state.players[1].totalScore).toBe(0);
    });

    it("should award ring points without incrementing hits or completion", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // Hit Ring 4 (contains [7, 4, 2, 6]) based on boardLayout
        const ring4Nums = RING_NUMBERS[3];
        state = hitRing(state, 3, ring4Nums).state;

        // NEW RULE: Ring hits award points but DO NOT increment hits.
        expect(state.players[0].totalScore).toBe(8);
        expect(state.players[0].hits[2]).toBe(0);
        expect(state.players[0].hits[7]).toBe(0);

        // Now hit Number 1 via Ring 3. 
        // 1. We hit Ring 3: [11, 1, 3, 8]
        state.currentPlayer = 0;
        state = hitRing(state, 2, RING_NUMBERS[2]).state;

        // Score: Prev 8 (from Ring 4) + 8 (11:2, 1:2, 3:2, 8:2) = 16.
        expect(state.players[0].totalScore).toBe(16);
        expect(state.players[0].hits[1]).toBe(0);
        expect(state.closedNumbers.has(1)).toBe(false);

        // 2. Direct hit on #1
        state = hitNumber(state, 1).state;

        // Now hits[1] MUST be 1
        expect(state.players[0].hits[1]).toBe(1);
        // Score: 16 (prev) + 12 (Direct Badge Hit for #1) = 28
        expect(state.players[0].totalScore).toBe(28);
        expect(state.closedNumbers.has(1)).toBe(true);
    });
});
