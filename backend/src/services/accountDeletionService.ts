/**
 * Account deletion / data erasure (App Store 5.1.1(v), DPDP/GDPR erasure).
 *
 * Privacy-first, but SAFE: it only ever touches records that belong to the
 * deleted user, never shared organizational or compliance records, and it never
 * invents a legal retention requirement. Every step is best-effort and
 * idempotent, so a repeated deletion, a missing related record, or a missing S3
 * object is a harmless no-op.
 *
 * Behaviour by collection (see reportAccountDeletionPlan for the summary shape):
 *   DELETE   Device, AIConversation, Notification, SavedItem, Meeting
 *   DELETE   Document (+versions +S3) ONLY when exclusively the user's, private,
 *            not part of a certification/application, not on legal hold
 *   ANONYMIZE User; Lead (when linked to a retained record); SupportTicket +
 *            the user's TicketMessages; CBRequest free-text; PartnerApplication
 *   DELETE   Lead when it is a standalone personal contact record (no linkage)
 *   RETAIN   Organization, Applications, Certifications, Payments, Audit logs
 *            (personal association is scrubbed via the anonymized User)
 *
 * No specific retention durations or regulatory claims are encoded here.
 */
import { Types } from 'mongoose'
import {
  S3Client,
  ListObjectVersionsCommand,
  DeleteObjectsCommand,
  type ObjectIdentifier,
} from '@aws-sdk/client-s3'
import { User } from '../models/User'
import { Device } from '../models/Device'
import { AIConversation } from '../models/AIConversation'
import { Notification } from '../models/Notification'
import { SavedItem } from '../models/SavedItem'
import { Meeting } from '../models/Meeting'
import { Document } from '../models/Document'
import { DocumentVersion } from '../models/DocumentVersion'
import { Lead } from '../models/Lead'
import { SupportTicket } from '../models/SupportTicket'
import { TicketMessage } from '../models/TicketMessage'
import { CBRequest } from '../models/CBRequest'
import { PartnerApplication } from '../models/PartnerApplication'
import { logger } from '../utils/logger'

const REDACTED = '[removed at account deletion]'

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-south-1' })
const BUCKET = process.env.AWS_S3_BUCKET ?? 'sanyog-conformity-docs'

export interface AccountDeletionSummary {
  deleted: {
    devices: number
    aiConversations: number
    notifications: number
    savedItems: number
    meetings: number
    documents: number
    leads: number
  }
  anonymized: {
    user: boolean
    leads: number
    supportTickets: number
    ticketMessages: number
    cbRequests: number
    partnerApplications: number
  }
  s3: {
    objectsPurged: number
    keysFailed: number
  }
}

/**
 * Permanently delete EVERY version (and delete marker) of one exact S3 key.
 * The bucket is versioned, so a plain delete would only add a delete marker and
 * leave the personal file recoverable. Best-effort: a missing object, a missing
 * bucket, or absent credentials resolves to 0 rather than failing the deletion.
 * Exported so tests can stub it (no AWS call in unit tests).
 */
export async function purgeAllObjectVersions(key: string): Promise<number> {
  if (!key) return 0
  let purged = 0
  let KeyMarker: string | undefined
  let VersionIdMarker: string | undefined
  try {
    do {
      const listed = await s3.send(
        new ListObjectVersionsCommand({ Bucket: BUCKET, Prefix: key, KeyMarker, VersionIdMarker }),
      )
      // Prefix can match longer keys; restrict to the EXACT key only.
      const ids: ObjectIdentifier[] = [
        ...(listed.Versions ?? []),
        ...(listed.DeleteMarkers ?? []),
      ]
        .filter((v) => v.Key === key && v.VersionId)
        .map((v) => ({ Key: key, VersionId: v.VersionId! }))

      if (ids.length) {
        await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: ids, Quiet: true } }))
        purged += ids.length
      }
      KeyMarker = listed.IsTruncated ? listed.NextKeyMarker : undefined
      VersionIdMarker = listed.IsTruncated ? listed.NextVersionIdMarker : undefined
    } while (KeyMarker || VersionIdMarker)
  } catch (e) {
    logger.warn(`[accountDeletion] S3 purge failed for key (best-effort): ${String(e)}`)
    throw e // surfaced to the caller so it can count a failed key; never aborts deletion
  }
  return purged
}

/**
 * Indirection seam so tests can stub S3 without any AWS call. Production always
 * uses the real purge above.
 */
export const _deps = { purgeAllObjectVersions }

/** A Document is deletable ONLY when it is exclusively this user's personal file. */
function isExclusivelyPersonalDocument(doc: any): boolean {
  return (
    doc.is_legal_hold !== true &&
    (!doc.retention_until || new Date(doc.retention_until) <= new Date()) &&
    !doc.certification_id &&
    (!doc.application_ids || doc.application_ids.length === 0) &&
    doc.visibility === 'private' &&
    (!doc.shared_with || doc.shared_with.length === 0)
  )
}

/**
 * Erase / anonymize all data owned by a user, then anonymize the User itself.
 * The User is anonymized LAST so earlier reads still resolve it.
 */
export async function deleteAccountData(userId: string | Types.ObjectId): Promise<AccountDeletionSummary> {
  const uid = new Types.ObjectId(String(userId))
  const summary: AccountDeletionSummary = {
    deleted: { devices: 0, aiConversations: 0, notifications: 0, savedItems: 0, meetings: 0, documents: 0, leads: 0 },
    anonymized: { user: false, leads: 0, supportTickets: 0, ticketMessages: 0, cbRequests: 0, partnerApplications: 0 },
    s3: { objectsPurged: 0, keysFailed: 0 },
  }
  const best = async (label: string, fn: () => Promise<void>) => {
    try { await fn() } catch (e) { logger.warn(`[accountDeletion] ${label} failed (best-effort): ${String(e)}`) }
  }

  // ── Hard-delete purely personal, user-owned collections ──────────────────
  await best('devices', async () => { summary.deleted.devices = (await Device.deleteMany({ user_id: uid })).deletedCount ?? 0 })
  await best('aiConversations', async () => { summary.deleted.aiConversations = (await AIConversation.deleteMany({ user_id: uid })).deletedCount ?? 0 })
  await best('notifications', async () => { summary.deleted.notifications = (await Notification.deleteMany({ user_id: uid })).deletedCount ?? 0 })
  await best('savedItems', async () => { summary.deleted.savedItems = (await SavedItem.deleteMany({ user_id: uid })).deletedCount ?? 0 })
  // Meetings: no known legitimate retention requirement → delete the user's records.
  await best('meetings', async () => { summary.deleted.meetings = (await Meeting.deleteMany({ user_id: uid })).deletedCount ?? 0 })

  // ── Documents: delete ONLY the exclusively-personal ones (+their S3 objects) ─
  await best('documents', async () => {
    const docs: any[] = await Document.find({ uploaded_by: uid })
      .setOptions({ includeDeleted: true } as any)
      .lean()
    for (const doc of docs) {
      if (!isExclusivelyPersonalDocument(doc)) continue // shared/compliance/legal-hold → retain
      const versions: any[] = await DocumentVersion.find({ document_id: doc._id }).select('+etag').lean()
      const keys = new Set<string>()
      for (const v of versions) {
        if (v.s3_key) keys.add(v.s3_key)
        if (v.thumbnail_s3_key) keys.add(v.thumbnail_s3_key)
        if (v.cert_chain_s3_key) keys.add(v.cert_chain_s3_key)
      }
      for (const key of keys) {
        try { summary.s3.objectsPurged += await _deps.purgeAllObjectVersions(key) }
        catch { summary.s3.keysFailed += 1 }
      }
      // Remove the DB records regardless of S3 outcome — a failed S3 purge must
      // not leave the personal DB record behind (it is re-attemptable via key).
      await DocumentVersion.deleteMany({ document_id: doc._id })
      await Document.deleteOne({ _id: doc._id }).setOptions({ includeDeleted: true } as any)
      summary.deleted.documents += 1
    }
  })

  // ── Lead: delete standalone personal enquiries; anonymize linked ones ────────
  await best('leads', async () => {
    const leads: any[] = await Lead.find({ user_id: uid }).lean()
    for (const lead of leads) {
      const linkedToBusinessRecord = !!lead.converted_application_id || !!lead.opportunity_id
      if (linkedToBusinessRecord) {
        await Lead.updateOne(
          { _id: lead._id },
          {
            $set: { contact_name: 'Deleted User', contact_email: `deleted+${uid}@deleted.invalid` },
            $unset: { contact_phone: 1, company_name: 1, product_description: 1, notes: 1 },
          },
        )
        summary.anonymized.leads += 1
      } else {
        await Lead.deleteOne({ _id: lead._id })
        summary.deleted.leads += 1
      }
    }
  })

  // ── Support tickets: keep the (two-party) shell, scrub the user's content ────
  await best('supportTickets', async () => {
    const tickets: any[] = await SupportTicket.find({ user_id: uid }).lean()
    const ids = tickets.map((t) => t._id)
    if (ids.length) {
      const r = await SupportTicket.updateMany(
        { _id: { $in: ids } },
        { $set: { subject: REDACTED, description: REDACTED } },
      )
      summary.anonymized.supportTickets = r.modifiedCount ?? 0
      // Only the USER's own messages carry the user's personal words/attachments;
      // staff replies are a business record and are left intact.
      const m = await TicketMessage.updateMany(
        { ticket_id: { $in: ids }, sender_role: 'user' },
        { $set: { body: REDACTED, attachments: [] } },
      )
      summary.anonymized.ticketMessages = m.modifiedCount ?? 0
    }
  })

  // ── CBRequest: scrub the customer's free-text; keep CB workflow/audit shell ──
  await best('cbRequests', async () => {
    const r = await CBRequest.updateMany({ user_id: uid }, { $unset: { message: 1 } })
    summary.anonymized.cbRequests = r.modifiedCount ?? 0
  })

  // ── PartnerApplication: anonymize contact PII + drop personal document refs ──
  await best('partnerApplications', async () => {
    const apps: any[] = await PartnerApplication.find({ user_id: uid }).lean()
    for (const a of apps) {
      await PartnerApplication.updateOne(
        { _id: a._id },
        {
          $set: {
            contact_name: 'Deleted User',
            email: `deleted+${uid}@deleted.invalid`,
            documents: [],
          },
          $unset: { phone: 1 },
        },
      )
      summary.anonymized.partnerApplications += 1
    }
  })

  // ── Anonymize the User last (scrub PII + destroy auth secrets) ───────────────
  await best('user', async () => {
    const anonEmail = `deleted+${uid}@deleted.invalid`
    await User.updateOne(
      { _id: uid },
      {
        $set: {
          deleted_at: new Date(),
          updated_at: new Date(),
          name: 'Deleted User',
          email: anonEmail,
          totp_enabled: false,
          expo_push_tokens: [],
          webpush_subscriptions: [],
        },
        $unset: {
          phone: 1, avatar_url: 1, password_hash: 1,
          otp_hash: 1, otp_expires_at: 1, otp_attempts: 1,
          pending_phone: 1, phone_otp_hash: 1, phone_otp_expires_at: 1, phone_otp_attempts: 1,
          totp_secret: 1,
          // Onboarding/business profile PII the user supplied.
          business_role: 1, company_name: 1, gst_number: 1, cin: 1, iec: 1, address: 1,
        },
      },
    )
    summary.anonymized.user = true
  })

  return summary
}

export default deleteAccountData
