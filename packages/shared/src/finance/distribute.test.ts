import { describe, expect, it } from "vitest";
import { distributePayment, roundHalfUp } from "./distribute.js";

const SOLO: Array<[number, number, number, number]> = [
  [1, 1, 0, 0],
  [3, 3, 0, 0],
  [7, 6, 0, 1],
  [15, 13, 0, 2],
  [50, 42, 0, 8],
  [99, 83, 0, 16],
  [100, 84, 0, 16],
  [101, 85, 0, 16],
  [333, 280, 0, 53],
  [999, 839, 0, 160],
  [1000, 840, 0, 160],
  [4999, 4199, 0, 800],
];

const WITH_COACH: Array<[number, number, number, number]> = [
  [1, 0, 1, 0],
  [3, 1, 2, 0],
  [7, 2, 4, 1],
  [15, 5, 8, 2],
  [50, 17, 25, 8],
  [99, 34, 50, 15],
  [100, 34, 50, 16],
  [101, 34, 51, 16],
  [333, 113, 167, 53],
  [999, 340, 500, 159],
  [1000, 340, 500, 160],
  [4999, 1700, 2500, 799],
];

describe("roundHalfUp", () => {
  it("rounds half up", () => {
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(82.82)).toBe(83);
    expect(roundHalfUp(32.32)).toBe(32);
    expect(roundHalfUp(49.5)).toBe(50);
  });
});

describe("distributePayment", () => {
  it.each(SOLO)(
    "solo %i → trainee %i, coach %i, operator %i",
    (amount, trainee, coach, operator) => {
      expect(distributePayment(amount, false)).toEqual({ trainee, coach, operator });
    },
  );

  it.each(WITH_COACH)(
    "with coach %i → trainee %i, coach %i, operator %i",
    (amount, trainee, coach, operator) => {
      expect(distributePayment(amount, true)).toEqual({ trainee, coach, operator });
    },
  );

  it("keeps invariants for a range of amounts", () => {
    for (let amount = 0; amount <= 2000; amount += 1) {
      for (const withCoach of [false, true]) {
        const d = distributePayment(amount, withCoach);
        expect(d.trainee + d.coach + d.operator).toBe(amount);
        expect(Math.abs(d.operator - amount * 0.16)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("rejects non-integers", () => {
    expect(() => distributePayment(100.5, false)).toThrow();
  });
});
