import { describe, expect, it } from "vitest";
import { distributePayment, roundHalfUp } from "./distribute.js";

const SOLO: Array<[number, number, number, number]> = [
  [1, 1, 0, 0],
  [3, 2, 0, 1],
  [7, 6, 0, 1],
  [15, 12, 0, 3],
  [50, 41, 0, 9],
  [99, 81, 0, 18],
  [100, 82, 0, 18],
  [101, 83, 0, 18],
  [333, 273, 0, 60],
  [999, 819, 0, 180],
  [1000, 820, 0, 180],
  [4999, 4099, 0, 900],
];

const WITH_COACH: Array<[number, number, number, number]> = [
  [1, 0, 1, 0],
  [3, 1, 2, 0],
  [7, 2, 4, 1],
  [15, 5, 8, 2],
  [50, 16, 25, 9],
  [99, 32, 50, 17],
  [100, 32, 50, 18],
  [101, 32, 51, 18],
  [333, 107, 167, 59],
  [999, 320, 500, 179],
  [1000, 320, 500, 180],
  [4999, 1600, 2500, 899],
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
        expect(Math.abs(d.operator - amount * 0.18)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("rejects non-integers", () => {
    expect(() => distributePayment(100.5, false)).toThrow();
  });
});
