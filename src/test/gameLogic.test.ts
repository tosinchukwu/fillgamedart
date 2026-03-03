import { describe, it, expect } from "vitest";
import { createInitialGameState, hitNumber } from "../game/gameLogic";

describe("Game Logic Per-Number Bonus Tests", () => {
    const p1 = { name: "Player 1", addr: "0x1" };
    const p2 = { name: "Player 2", addr: "0x2" };

    it("should award Top Filler Bonus (+7) per number to the player with more hits (Only for 2-14)", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // P1 hits #1 once. TFP for #1 should be 0.
        state = hitNumber(state, 1).state;
        expect(state.players[0].totalScore).toBe(2);

        // P1 hits #2 once. TFP for #2 should go to P1.
        state = hitNumber(state, 2).state;

        // P1 Score: 2 (filler #1) + 2 (filler #2) + 7 (TFP #2) = 11
        expect(state.players[0].totalScore).toBe(11);

        // P2 hits #2 twice. TFP for #2 should shift to P2.
        state.currentPlayer = 1;
        state = hitNumber(state, 2).state;
        state = hitNumber(state, 2).state;

        // P2 hits: 2. Filler: 2*2=4. TFP: 7. Total: 11.
        expect(state.players[1].totalScore).toBe(11);
        // P1 hits: 1 for #1, 1 for #2. Filler: 2 + 2 = 4. TFP: 0. Total: 4.
        expect(state.players[0].totalScore).toBe(4);
    });

    it("should split Top Filler Bonus (3.5 each) on tied hits per number", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        state = hitNumber(state, 5).state; // P1 hits #5
        state.currentPlayer = 1;
        state = hitNumber(state, 5).state; // P2 hits #5

        // Both have 1 hit. Both get 2 filler + 3.5 TFP = 5.5
        expect(state.players[0].totalScore).toBe(5.5);
        expect(state.players[1].totalScore).toBe(5.5);
    });

    it("should cap filler points at number value but keep hits uncapped for TFP", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // Number 2 requires 2 hits.
        state = hitNumber(state, 2).state; // 1st hit: +2 filler + 7 TFP = 9
        state = hitNumber(state, 2).state; // 2nd hit: +2 filler + 7 TFP = 11
        state = hitNumber(state, 2).state; // 3rd hit: +0 filler (capped) + 7 TFP = 11

        expect(state.players[0].totalScore).toBe(11);
        expect(state.players[0].hits[2]).toBe(3);
    });

    it("should award Fill-Up Bonus (+10) to the last player to complete a number", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // Number 1
        state = hitNumber(state, 1).state; // P1 completes #1 personally. TFP for #1 is 0. Score = 2.
        state.currentPlayer = 1;
        state = hitNumber(state, 1).state; // P2 completes #1. Board closes. TFP for #1 is 0.

        // P2 gets 2 filler + 10 Fill-Up = 12
        expect(state.players[1].totalScore).toBe(12);
        // P1 gets 2 filler = 2
        expect(state.players[0].totalScore).toBe(2);
    });
});
