/**
 * Ownership service barrel export.
 *   import { getOwnership, canAccessApplication } from '../services/ownership';
 */
export * from './ownershipService';
// Sprint 3 — backfill + dual-write + validation (none wired into read paths).
export * from './ownershipDerivation';
export * from './personalOrganization';
export * from './backfillService';
export * from './dualWrite';
export * from './ownershipValidation';
