/**
 * Investment ROI — transparent, user-input-driven calculations.
 *
 * Every output here is CALCULATED from USER INPUT via the explicit formulas
 * below. Nothing is a verified market fact and nothing is fabricated — if a cost
 * is unknown the user enters it (or leaves it 0). Formulas are surfaced in the
 * UI so the result is auditable.
 */
export interface RoiInputs {
  investment: number;        // upfront setup / capital investment
  certificationCost: number; // user-entered (we never invent certification prices)
  unitCost: number;          // product cost per unit (variable)
  logistics: number;         // total logistics cost (fixed)
  otherCosts: number;        // any other fixed costs
  sellingPrice: number;      // selling price per unit
  units: number;             // expected units sold
}

export interface RoiResult {
  revenue: number;           // sellingPrice × units
  variableCost: number;      // unitCost × units
  fixedCosts: number;        // investment + certification + logistics + other
  totalCosts: number;        // variableCost + fixedCosts
  totalInvestment: number;   // capital deployed (fixed + variable)
  grossProfit: number;       // revenue − variableCost
  netReturn: number;         // revenue − totalCosts
  roiPercent: number | null; // netReturn / totalInvestment × 100
  marginPercent: number | null; // netReturn / revenue × 100
  contributionPerUnit: number;  // sellingPrice − unitCost
  breakEvenUnits: number | null;    // ceil(fixedCosts / contributionPerUnit)
  breakEvenRevenue: number | null;  // breakEvenUnits × sellingPrice
}

const n = (v: number) => (Number.isFinite(v) ? v : 0);

export function computeRoi(i: RoiInputs): RoiResult {
  const investment = n(i.investment);
  const certificationCost = n(i.certificationCost);
  const unitCost = n(i.unitCost);
  const logistics = n(i.logistics);
  const otherCosts = n(i.otherCosts);
  const sellingPrice = n(i.sellingPrice);
  const units = n(i.units);

  const revenue = sellingPrice * units;
  const variableCost = unitCost * units;
  const fixedCosts = investment + certificationCost + logistics + otherCosts;
  const totalCosts = variableCost + fixedCosts;
  const totalInvestment = fixedCosts + variableCost;
  const grossProfit = revenue - variableCost;
  const netReturn = revenue - totalCosts;
  const contributionPerUnit = sellingPrice - unitCost;

  const roiPercent = totalInvestment > 0 ? (netReturn / totalInvestment) * 100 : null;
  const marginPercent = revenue > 0 ? (netReturn / revenue) * 100 : null;
  const breakEvenUnits = contributionPerUnit > 0 ? Math.ceil(fixedCosts / contributionPerUnit) : null;
  const breakEvenRevenue = breakEvenUnits != null ? breakEvenUnits * sellingPrice : null;

  return {
    revenue, variableCost, fixedCosts, totalCosts, totalInvestment,
    grossProfit, netReturn, roiPercent, marginPercent, contributionPerUnit,
    breakEvenUnits, breakEvenRevenue,
  };
}

export type ScenarioKey = 'conservative' | 'expected' | 'optimistic';

/** Scenario multipliers applied to units and selling price (clearly labeled). */
export const SCENARIOS: Record<ScenarioKey, { label: string; unitsMult: number; priceMult: number }> = {
  conservative: { label: 'Conservative', unitsMult: 0.7, priceMult: 0.9 },
  expected:     { label: 'Expected',     unitsMult: 1.0, priceMult: 1.0 },
  optimistic:   { label: 'Optimistic',   unitsMult: 1.2, priceMult: 1.1 },
};

export function computeScenarios(base: RoiInputs): Record<ScenarioKey, RoiResult> {
  const out = {} as Record<ScenarioKey, RoiResult>;
  (Object.keys(SCENARIOS) as ScenarioKey[]).forEach((k) => {
    const s = SCENARIOS[k];
    out[k] = computeRoi({ ...base, units: base.units * s.unitsMult, sellingPrice: base.sellingPrice * s.priceMult });
  });
  return out;
}
