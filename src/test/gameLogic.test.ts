import { describe, it, expect } from "vitest";
import { createInitialGameState, hitNumber } from "../game/gameLogic";

describe("Game Logic Refinement Tests", () => {
    const p1 = { name: "Player 1", addr: "0x1" };
    const p2 = { name: "Player 2", addr: "0x2" };

    it("should award Fill-Up Bonus (10pts) to the LAST player to complete a number", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // Player 1 hits Number 1 (requires 1 hit to complete)
        state = hitNumber(state, 1).state;
        expect(state.players[0].completed[1]).toBe(true);
        expect(state.closedNumbers.has(1)).toBe(false); // Not closed yet, P2 hasn't completed it
        expect(state.players[0].totalScore).toBe(2); // Just 2 filler pts

        // Switch to Player 2 and complete Number 1
        state.currentPlayer = 1;
        state = hitNumber(state, 1).state;
        expect(state.players[1].completed[1]).toBe(true);
        expect(state.closedNumbers.has(1)).toBe(true); // Now closed!

        // Player 2 should get 2 filler + 10 fill-up = 12 pts
        expect(state.players[1].totalScore).toBe(12);
    });

    it("should award Top Filler Bonus (7pts) as a single bonus for most hits on 2-14", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // P1 hits #2 once
        state = hitNumber(state, 2).state;
        // P1 total: 2 filler + 7 TFP = 9
        expect(state.players[0].totalScore).toBe(9);

        // P2 hits #3 twice
        state.currentPlayer = 1;
        state = hitNumber(state, 3).state;
        state = hitNumber(state, 3).state;

        // P2 has 2 hits, P1 has 1 hit. P2 should now have the 7pt bonus.
        // P2: 2 hits * 2 pts = 4 filler. Plus 7 TFP = 11.
        expect(state.players[1].totalScore).toBe(11);
        // P1 should lose TFP: 1 hit * 2 pts = 2.
        expect(state.players[0].totalScore).toBe(2);
    });

    it("should split Top Filler Bonus (3.5pts each) on tie across 2-14", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        state = hitNumber(state, 2).state; // P1: 1 hit
        state.currentPlayer = 1;
        state = hitNumber(state, 3).state; // P2: 1 hit

        expect(state.players[0].totalScore).toBe(2 + 3.5);
        expect(state.players[1].totalScore).toBe(2 + 3.5);
    });

    it("should win immediately in Batch 2 upon surpassing target", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // Setup Batch 2
        state.batch = 2;
        state.batch1Scores = [230, 150]; // P1: 230, P2: 150
        // P1 Target: 150
        // P2 Target: 230

        state.currentPlayer = 0;
        // P1 hits numbers to reach > 150
        // We can just manually set hits to simulate pts if we want to skip long sequence
        state.players[0].hits[14] = 76; // 76 * 2 = 152

        // Trigger check via hit
        const result = hitNumber(state, 1); // Hit #1 (doesn't matter which)

        expect(result.state.gameOver).toBe(true);
        expect(result.state.winner).toBe(0);
        expect(result.state.lastAction).toContain("surpassed the target of 150");
    });
});
