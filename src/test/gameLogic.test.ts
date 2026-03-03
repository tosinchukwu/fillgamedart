import { describe, it, expect } from "vitest";
import { createInitialGameState, hitNumber } from "../game/gameLogic";

describe("Game Logic Per-Number Bonus Tests", () => {
    const p1 = { name: "Player 1", addr: "0x1" };
    const p2 = { name: "Player 2", addr: "0x2" };

    it("should award Top Filler Bonus (+7) per number to the player with more hits", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // P1 hits #2 once. TFP for #2 should go to P1.
        state = hitNumber(state, 2).state;

        // P1 Score: 2 (filler) + 7 (TFP #2) = 9
        expect(state.players[0].totalScore).toBe(9);

        // P2 hits #2 twice. TFP for #2 should shift to P2.
        state.currentPlayer = 1;
        state = hitNumber(state, 2).state;
        state = hitNumber(state, 2).state;

        // P2 hits: 2. Filler: 2*2=4. TFP: 7. Total: 11.
        expect(state.players[1].totalScore).toBe(11);
        // P1 hits: 1. Filler: 1*2=2. TFP: 0. Total: 2.
        expect(state.players[0].totalScore).toBe(2);
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

        // Number 1 requires 1 hit.
        state = hitNumber(state, 1).state; // 1st hit: +2 pts
        state = hitNumber(state, 1).state; // 2nd hit: +0 pts (filler capped), but TFP still +7

        // P1 Score: 2 (capped filler) + 7 (TFP #1) = 9
        expect(state.players[0].totalScore).toBe(9);
        expect(state.players[0].hits[1]).toBe(2);
    });

    it("should award Fill-Up Bonus (+10) to the last player to complete a number", () => {
        let state = createInitialGameState(p1.name, p1.addr, p2.name, p2.addr);

        // Number 1
        state = hitNumber(state, 1).state; // P1 completes #1 personally.
        state.currentPlayer = 1;
        state = hitNumber(state, 1).state; // P2 completes #1. Board closes.

        // P2 gets 2 filler + 3.5 TFP (tied 1-1) + 10 Fill-Up = 15.5
        expect(state.players[1].totalScore).toBe(15.5);
        // P1 gets 2 filler + 3.5 TFP = 5.5
        expect(state.players[0].totalScore).toBe(5.5);
    });
});
