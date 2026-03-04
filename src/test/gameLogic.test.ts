import { describe, it, expect } from "vitest";
import { createInitialGameState, hitNumber, hitRing } from "../game/gameLogic";
import { RING_NUMBERS } from "../game/boardLayout";

describe("Game Logic Per-Number Bonus Tests (New Rules)", () => {
    const p1 = { name: "Player 1", addr: "0x1" };
    const p2 = { name: "Player 2", addr: "0x2" };

    it("should award Top Filler Bonus (+7) only when both players have passed half threshold", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // n=4. Threshold = 2.
        // P0 hits #4 twice.
        state = hitNumber(state, 4, true).state;
        state = hitNumber(state, 4, true).state;

        // P1 hits #4 three times. Board not closed (P0 needs 4).
        state.currentPlayer = 1;
        state = hitNumber(state, 4, true).state;
        state = hitNumber(state, 4, true).state;
        state = hitNumber(state, 4, true).state;

        expect(state.closedNumbers.has(4)).toBe(false);

        // P0 hits #4 twice more. 
        state.currentPlayer = 0;
        state = hitNumber(state, 4, true).state;
        state = hitNumber(state, 4, true).state;

        // Board not closed yet. P1 only has 3. P1 needs 4.
        expect(state.closedNumbers.has(4)).toBe(false);

        // Let's finish P1.
        state.currentPlayer = 1;
        state = hitNumber(state, 4, true).state; // P1 hit: 4. Board NOW closed.

        expect(state.closedNumbers.has(4)).toBe(true);
        // TFP: P0(4), P1(4). Threshold (2). Both > 2. It's a tie! 3.5 each.
        // P0 Score: (4*2 filler) + 3.5 TFP = 11.5
        // P1 Score: (4*2 filler) + 3.5 TFP + 10 FillUp (P1 closed it) = 21.5
        expect(state.players[0].totalScore).toBe(11.5);
        expect(state.players[1].totalScore).toBe(21.5);
    });

    it("should count Ring hits as direct hits for all numbers in group", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // Hit Ring 4 (contains [7, 4, 2, 6])
        const ring4Nums = RING_NUMBERS[3];
        state = hitRing(state, 3, ring4Nums).state;

        // NEW RULE: Ring hits AWARD direct hits.
        expect(state.players[0].hits[7]).toBe(1);
        expect(state.players[0].hits[4]).toBe(1);
        expect(state.players[0].hits[2]).toBe(1);
        expect(state.players[0].hits[6]).toBe(1);

        // Score: 4 numbers * 2 filler = 8
        expect(state.players[0].totalScore).toBe(8);
    });

    it("should award Number 1 bonus (+12) only once per batch", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        state = hitNumber(state, 1, true).state;
        expect(state.players[0].totalScore).toBe(12);

        // Second hit on #1 in same batch
        state = hitNumber(state, 1, true).state;
        expect(state.players[0].totalScore).toBe(12); // Should remain 12
    });

    it("should award Fill-Up Bonus (+10) to the player who completes board closure (both finished)", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // Number 2. 
        // P1 hits #2 twice. Completed personally, but board not closed.
        state.currentPlayer = 1;
        state = hitNumber(state, 2, true).state;
        state = hitNumber(state, 2, true).state;
        expect(state.closedNumbers.has(2)).toBe(false);
        expect(state.players[1].totalScore).toBe(4); // 2*2 filler. No bonus.

        // P0 hits #2 twice.
        state.currentPlayer = 0;
        state = hitNumber(state, 2, true).state;
        state = hitNumber(state, 2, true).state; // Closes board.

        expect(state.closedNumbers.has(2)).toBe(true);
        // P0 Score: 4 (filler) + 10 (FillUp) + 3.5 TFP (Tie) = 17.5
        // P1 Score: 4 (filler) + 3.5 TFP = 7.5
        expect(state.players[0].totalScore).toBe(17.5);
        expect(state.players[1].totalScore).toBe(7.5);
    });
});
