/**
 * Customer Health Score.
 *
 * A single, explainable 0–100 score for a customer, composed of weighted factors
 * so both mobile and admin can show the same number and the same breakdown. Pure
 * function — the caller supplies already-aggregated inputs (no DB access here) so
 * it stays cheap and testable and is the single source of truth for "how healthy
 * is this customer".
 */

export type HealthBand = 'excellent' | 'good' | 'fair' | 'at_risk';

export interface HealthFactor {
  key: string;
  label: string;
  points: number; // contribution to the score (can be negative for risk factors)
  max: number;    // maximum this factor can contribute (0 for pure penalties)
  detail?: string;
}

export interface CustomerHealth {
  score: number;      // 0–100
  band: HealthBand;
  factors: HealthFactor[];
}

export interface CustomerHealthInput {
  profileCompletion: number;   // 0–100 (from serializeUser)
  applications: number;
  certifications: number;
  renewalsDue: number;
  payments: number;
  onboardingComplete: boolean;
}

export function computeCustomerHealth(input: CustomerHealthInput): CustomerHealth {
  const factors: HealthFactor[] = [];

  // Profile completeness — up to 30
  const profilePts = Math.round((Math.max(0, Math.min(100, input.profileCompletion)) / 100) * 30);
  factors.push({ key: 'profile', label: 'Profile completeness', points: profilePts, max: 30, detail: `${input.profileCompletion}% complete` });

  // Onboarding — up to 10
  factors.push({ key: 'onboarding', label: 'Onboarding', points: input.onboardingComplete ? 10 : 0, max: 10 });

  // Active certifications — up to 25
  const certPts = input.certifications > 0 ? Math.min(25, 10 + input.certifications * 5) : 0;
  factors.push({ key: 'certifications', label: 'Active certifications', points: certPts, max: 25, detail: `${input.certifications} certificate(s)` });

  // Application engagement — up to 20
  const engagePts = input.applications > 0 ? Math.min(20, input.applications * 7) : 0;
  factors.push({ key: 'engagement', label: 'Application activity', points: engagePts, max: 20, detail: `${input.applications} application(s)` });

  // Payment history — up to 15
  factors.push({ key: 'payments', label: 'Payment history', points: input.payments > 0 ? 15 : 0, max: 15, detail: `${input.payments} payment(s)` });

  // Renewal risk — penalty up to -15
  const renewalPenalty = Math.min(15, input.renewalsDue * 7);
  if (renewalPenalty > 0) {
    factors.push({ key: 'renewal_risk', label: 'Renewals overdue soon', points: -renewalPenalty, max: 0, detail: `${input.renewalsDue} due` });
  }

  const score = Math.max(0, Math.min(100, factors.reduce((s, f) => s + f.points, 0)));
  const band: HealthBand = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'at_risk';

  return { score, band, factors };
}
