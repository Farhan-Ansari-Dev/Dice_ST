/**
 * Shared types used across backend, mobile-app, and admin-dashboard.
 *
 * Import via: import { ApplicationStatus, UserRole } from '@shared/types';
 */

// ── Application Workflow ─────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'docs_review'
  | 'docs_required'
  | 'tech_review'
  | 'testing'
  | 'approval_pending'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'cert_issued'
  | 'cancelled';

export type ApplicationPriority = 'low' | 'medium' | 'high' | 'urgent';

// ── Certification ────────────────────────────────────────────────────────────

export type CertificationStatus = 'active' | 'expiring_soon' | 'expired' | 'pending' | 'suspended' | 'revoked';

export type CertificationType =
  | 'BIS_CRS'
  | 'BIS_ISI'
  | 'BIS_HALLMARK'
  | 'FSSAI'
  | 'CE'
  | 'ISO_9001'
  | 'ISO_14001'
  | 'ISO_45001'
  | 'WPC'
  | 'TEC_ETA'
  | 'EPR'
  | 'NABL';

// ── Users & Roles ────────────────────────────────────────────────────────────

export type UserRole = 'client' | 'admin' | 'super_admin' | 'consultant' | 'manager' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  company_name?: string;
}

// ── Payments ─────────────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_paid';

export type PaymentMethod = 'upi' | 'netbanking' | 'card' | 'neft' | 'razorpay';

// ── Documents ────────────────────────────────────────────────────────────────

export type DocumentCategory = 'test_report' | 'certificate' | 'invoice' | 'declaration' | 'authorization' | 'general';

// ── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = 'application' | 'certification' | 'payment' | 'document' | 'system' | 'reminder';

// ── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
