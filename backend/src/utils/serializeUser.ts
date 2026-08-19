/**
 * Single source of truth for the client-facing user payload.
 *
 * Both POST /auth/* and GET|PUT /users/me return this shape, so the mobile
 * client sees an identical user object no matter which endpoint produced it.
 * Previously auth returned `id` while /users/me returned the raw Mongoose doc
 * (`_id`), which silently broke profile reloads on cold start.
 *
 * DB fields are snake_case (model convention); the wire contract is camelCase
 * and is unchanged from what POST /auth/verify-otp already returned.
 */
import { Application } from '../models/Application';
import { Certification } from '../models/Certification';
import { Insight } from '../models/Insight';

/** Onboarding is complete once the wizard has been submitted at least once. */
export function isOnboardingComplete(user: any): boolean {
  return Boolean(user?.onboarding_completed_at);
}

/**
 * Customer profile completeness (0–100). Weighted equally across the fields that
 * matter for applications/certifications. `country_code` is excluded because it
 * always defaults to "IN" and would inflate the score. Single source of truth so
 * mobile + admin show the same number.
 */
export function computeProfileCompletion(user: any): number {
  const checks = [
    !!user?.name,
    !!user?.phone,
    !!user?.company_name,
    !!user?.gst_number,
    !!user?.business_role,
    !!user?.company_size,
    Array.isArray(user?.industries) && user.industries.length > 0,
    Array.isArray(user?.target_markets) && user.target_markets.length > 0,
    !!(user?.address && user.address.line1),
    !!user?.iec,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export interface SerializeOptions {
  /** Include applications/certifications/insights counts (extra DB round-trips). */
  withCounts?: boolean;
}

export async function serializeUser(user: any, options: SerializeOptions = {}) {
  const { withCounts = true } = options;

  let applicationsCount = 0;
  let certificationsCount = 0;
  let insightsRead = 0;

  if (withCounts) {
    const query: any = { org_id: user.org_id };
    if (!user.org_id) {
      query.created_by = user._id;
    }

    [applicationsCount, certificationsCount, insightsRead] = await Promise.all([
      Application.countDocuments({ ...query, deleted_at: { $exists: false } }),
      Certification.countDocuments({ ...query, deleted_at: { $exists: false } }),
      Insight.countDocuments({ ...query, deleted_at: { $exists: false } }),
    ]);
  }

  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    org_id: user.org_id,
    phone: user.phone,
    avatar_url: user.avatar_url,
    locale: user.locale,
    country_code: user.country_code,
    isVerified: Boolean(user.email_verified_at),

    // Onboarding + company profile
    companyName: user.company_name,
    gstNumber: user.gst_number,
    cin: user.cin,
    iec: user.iec,
    address: user.address ?? null,
    businessRole: user.business_role,
    industries: user.industries ?? [],
    targetMarkets: user.target_markets ?? [],
    interestedCertifications: user.interested_certifications ?? [],
    companySize: user.company_size,
    businessGoals: user.business_goals ?? [],
    onboardingCompletedAt: user.onboarding_completed_at ?? null,
    isOnboardingComplete: isOnboardingComplete(user),
    profileCompletion: computeProfileCompletion(user),

    // Consultant verification state machine (NOT_SUBMITTED=null → pending →
    // verified/rejected). The mobile Consultant Zone reads these to show the
    // real backend status instead of assuming approval from business_role.
    consultantVerificationStatus: user.consultant_verification_status ?? null,
    consultantRejectionReason: user.consultant_rejection_reason ?? null,
    consultantVerificationDocuments: user.consultant_verification_documents ?? [],

    applicationsCount,
    certificationsCount,
    insightsRead,
  };
}
