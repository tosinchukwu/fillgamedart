import { describe, it, expect } from "vitest";
import { createInitialGameState, hitNumber } from "../game/gameLogic";

describe("Game Logic Bonus Rules", () => {
    const p1 = { name: "Player 1", addr: "0x1" };
    const p2 = { name: "Player 2", addr: "0x2" };

    it("should award Fill-Up Bonus (10pts) to the FIRST player to complete a number and close it", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // Player 1 hits Number 1 (requires 1 hit to complete)
        const result = hitNumber(state, 1);
        state = result.state;

        expect(state.players[0].fillUpBonuses).toBe(10);
        expect(state.players[0].completed[1]).toBe(true);
        expect(state.closedNumbers.has(1)).toBe(true);

        // Switch to Player 2
        state.currentPlayer = 1;
        const result2 = hitNumber(state, 1);
        state = result2.state;

        // Player 2 should NOT get points or hits because it's closed
        expect(state.players[1].hits[1]).toBe(0);
        expect(result2.message).toContain("Number 1 is closed");
    });

    it("should award Top Filler Bonus (7pts) to the current leader even if number is open", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // Number 7 requires 7 hits
        // Player 1 hits 7 once
        state = hitNumber(state, 7).state;
        expect(state.players[0].totalScore).toBe(2 + 7); // 2 filler + 7 top filler

        // Player 2 hits 7 twice (needs to switch turn first or just force hit)
        state.currentPlayer = 1;
        state = hitNumber(state, 7).state;
        state = hitNumber(state, 7).state;

        // Player 2 now has 2 hits, Player 1 has 1 hit.
        // Player 2 should lead.
        expect(state.players[1].totalScore).toBe(4 + 7); // 4 filler + 7 top filler
        expect(state.players[0].totalScore).toBe(2); // Only filler points left
    });

    it("should split Top Filler Bonus (3.5pts each) on tie", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        state = hitNumber(state, 7).state;
        state.currentPlayer = 1;
        state = hitNumber(state, 7).state;

        expect(state.players[0].totalScore).toBe(2 + 3.5);
        expect(state.players[1].totalScore).toBe(2 + 3.5);
    });
});
