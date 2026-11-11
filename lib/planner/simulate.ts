/**
 * Purpose: Educational investing projection as a LOW–HIGH range (never a single return).
 * Inputs: monthly contribution (usually the planner's safeToInvest), horizon months,
 * optional annual return band. Plain numbers only — no database.
 * Outputs: month-by-month balances for low / mid / high cases, plus totals and a disclaimer.
 *
 * WHY a range: CRAFT never promises returns. The LLM may explain these numbers; it never
 * invents them. Simulated and educational only — not advice, not trading.
 */

/** Default educational annual return band (percent). Mid is illustrative, not a forecast. */
export const DEFAULT_RETURN_BAND = {
  lowAprPct: 2,
  midAprPct: 5,
  highAprPct: 8,
} as const;

export type SimulateInput = {
  /** Monthly contribution in major units (e.g. planner safeToInvest). */
  monthlyContribution: number;
  /** How many months to project. */
  months: number;
  /** Starting balance already invested (default 0). */
  startingBalance?: number;
  lowAprPct?: number;
  midAprPct?: number;
  highAprPct?: number;
};

export type SimulateMonth = {
  monthIndex: number;
  contribution: number;
  balanceLow: number;
  balanceMid: number;
  balanceHigh: number;
};

export type InvestingSimulation =
  | {
      kind: "simulation";
      months: SimulateMonth[];
      totals: {
        contributed: number;
        endLow: number;
        endMid: number;
        endHigh: number;
      };
      assumptions: string[];
      disclaimer: string;
    }
  | { kind: "skipped"; reason: string };

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Project contributions with a low/mid/high annual return band, compounded monthly.
 * Returns `skipped` when there is nothing to contribute. Throws on invalid numbers.
 */
export function simulateInvesting(input: SimulateInput): InvestingSimulation {
  const contrib = input.monthlyContribution;
  const months = input.months;
  const start = input.startingBalance ?? 0;
  const lowApr = input.lowAprPct ?? DEFAULT_RETURN_BAND.lowAprPct;
  const midApr = input.midAprPct ?? DEFAULT_RETURN_BAND.midAprPct;
  const highApr = input.highAprPct ?? DEFAULT_RETURN_BAND.highAprPct;

  if (!Number.isFinite(contrib) || contrib < 0) {
    throw new RangeError("Monthly contribution must be zero or more.");
  }
  if (!Number.isInteger(months) || months < 1) {
    throw new RangeError("Horizon must be a whole number of months (at least 1).");
  }
  if (!Number.isFinite(start) || start < 0) {
    throw new RangeError("Starting balance must be zero or more.");
  }
  for (const [label, value] of [
    ["low", lowApr],
    ["mid", midApr],
    ["high", highApr],
  ] as const) {
    if (!Number.isFinite(value) || value < -50 || value > 50) {
      throw new RangeError(`Annual ${label} return must be between -50% and 50%.`);
    }
  }
  if (!(lowApr <= midApr && midApr <= highApr)) {
    throw new RangeError("Return band must satisfy low <= mid <= high.");
  }

  if (contrib === 0 && start === 0) {
    return {
      kind: "skipped",
      reason: "Nothing to simulate — safe-to-invest is zero and there is no starting balance.",
    };
  }

  const rLow = lowApr / 100 / 12;
  const rMid = midApr / 100 / 12;
  const rHigh = highApr / 100 / 12;

  let balLow = start;
  let balMid = start;
  let balHigh = start;
  const rows: SimulateMonth[] = [];

  for (let i = 1; i <= months; i++) {
    // Contribute at the start of the month, then apply the monthly rate.
    balLow = (balLow + contrib) * (1 + rLow);
    balMid = (balMid + contrib) * (1 + rMid);
    balHigh = (balHigh + contrib) * (1 + rHigh);
    rows.push({
      monthIndex: i,
      contribution: contrib,
      balanceLow: round2(balLow),
      balanceMid: round2(balMid),
      balanceHigh: round2(balHigh),
    });
  }

  const contributed = round2(start + contrib * months);
  return {
    kind: "simulation",
    months: rows,
    totals: {
      contributed,
      endLow: round2(balLow),
      endMid: round2(balMid),
      endHigh: round2(balHigh),
    },
    assumptions: [
      `Monthly contribution of ${contrib.toFixed(2)} for ${months} months.`,
      `Educational annual return band ${lowApr}% / ${midApr}% / ${highApr}% (low / mid / high), compounded monthly.`,
      "Contributions are added at the start of each month before growth is applied.",
    ],
    disclaimer:
      "Educational simulation only. Not financial advice, not a promised return, and not a trade. Ranges only.",
  };
}
