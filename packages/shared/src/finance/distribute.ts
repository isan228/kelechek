export type PaymentDistribution = {
  trainee: number;
  coach: number;
  operator: number;
};

/** Математическое округление, половина вверх. Только для неотрицательных. */
export function roundHalfUp(x: number): number {
  if (x < 0) {
    throw new Error("roundHalfUp: value must be >= 0");
  }
  return Math.floor(x + 0.5);
}

/**
 * Единственная функция распределения платежа.
 * Самостоятельно: 84% / 0%. С тренером: 34% / 50%. Оператор — остаток.
 * Инварианты: сумма долей = платежу; |оператор − 16%| ≤ 1 сом.
 */
export function distributePayment(
  amountSom: number,
  hasActiveCoach: boolean,
): PaymentDistribution {
  if (!Number.isInteger(amountSom) || amountSom < 0) {
    throw new Error("amountSom must be a non-negative integer");
  }

  const traineeRate = hasActiveCoach ? 0.34 : 0.84;
  const trainee = roundHalfUp(amountSom * traineeRate);
  const coach = hasActiveCoach ? roundHalfUp(amountSom * 0.5) : 0;
  const operator = amountSom - trainee - coach;

  if (trainee + coach + operator !== amountSom) {
    throw new Error("distribution invariant violated: shares must sum to payment");
  }
  if (Math.abs(operator - amountSom * 0.16) > 1) {
    throw new Error("operator share deviation from 16% exceeds 1 som");
  }

  return { trainee, coach, operator };
}

export const TRAINEE_SOLO_BPS = 8400;
export const TRAINEE_WITH_COACH_BPS = 3400;
export const COACH_BPS = 5000;

export function ratesFor(hasActiveCoach: boolean) {
  return {
    traineeBps: hasActiveCoach ? TRAINEE_WITH_COACH_BPS : TRAINEE_SOLO_BPS,
    coachBps: hasActiveCoach ? COACH_BPS : 0,
  };
}
