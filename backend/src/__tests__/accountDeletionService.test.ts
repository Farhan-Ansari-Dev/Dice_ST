/**
 * Privacy-first account-deletion service — per-collection erasure/anonymization.
 *
 * Exercises deleteAccountData() directly against an in-memory Mongo, with the S3
 * purge STUBBED (no AWS call). Verifies exactly which records are deleted,
 * anonymized, and retained, and that shared/compliance records are never
 * destroyed by one user's deletion.
 */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as svc from '../services/accountDeletionService';
import { User } from '../models/User';
import { Device } from '../models/Device';
import { AIConversation } from '../models/AIConversation';
import { Notification } from '../models/Notification';
import { SavedItem } from '../models/SavedItem';
import { Meeting } from '../models/Meeting';
import { Document } from '../models/Document';
import { DocumentVersion } from '../models/DocumentVersion';
import { Lead } from '../models/Lead';
import { SupportTicket } from '../models/SupportTicket';
import { TicketMessage } from '../models/TicketMessage';
import { CBRequest } from '../models/CBRequest';
import { PartnerApplication } from '../models/PartnerApplication';
import { Organization } from '../models/Organization';
import { Payment } from '../models/Payment';

let mongoServer: MongoMemoryServer;
let purgeSpy: jest.SpyInstance;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});
beforeEach(() => {
  // Never touch AWS in tests: stub the S3 purge to report N objects removed.
  purgeSpy = jest.spyOn(svc._deps, 'purgeAllObjectVersions').mockResolvedValue(1);
});
afterEach(async () => {
  purgeSpy.mockRestore();
  for (const c of Object.values(mongoose.connection.collections)) await c.deleteMany({});
});

async function makeUser(extra: Record<string, any> = {}) {
  return User.create({ email: `u${Math.random().toString(36).slice(2)}@t.com`, name: 'Real Name', role: 'client', otp_attempts: 0, ...extra });
}
const anon = (uid: any) => `deleted+${uid}@deleted.invalid`;

async function makeVersionedDoc(uid: Types.ObjectId, over: Record<string, any> = {}) {
  const docId = new Types.ObjectId();
  const ver = await DocumentVersion.create({
    document_id: docId, version_number: 1,
    s3_bucket: 'b', s3_key: `orgs/none/docs/${docId}/v1-file.pdf`, s3_region: 'ap-south-1',
    original_filename: 'file.pdf', mime_type: 'application/pdf', size_bytes: 10, sha256: 'x'.repeat(64),
    thumbnail_s3_key: `orgs/none/docs/${docId}/v1-thumb.jpg`,
    uploaded_by: uid,
  });
  const doc = await Document.create({
    _id: docId, uploaded_by: uid, name: 'F', doc_type: 'test_report',
    current_version_id: ver._id, version_count: 1,
    visibility: 'private', is_legal_hold: false,
    ...over,
  });
  return { doc, ver };
}

describe('deleteAccountData — deletes purely personal collections', () => {
  it('deletes devices, AI conversations, notifications, saved items, meetings', async () => {
    const u = await makeUser();
    const uid = u._id as Types.ObjectId;
    await Device.create({ user_id: uid, platform: 'ios', device_token: 'tok' } as any);
    await AIConversation.create({ user_id: uid, messages: [{ role: 'user', text: 'secret plan' }] });
    await Notification.create({ user_id: uid, type: 'x', title: 't', body: 'b' });
    await SavedItem.create({ user_id: uid, item_type: 'opportunity', item_id: 'o1' });
    await Meeting.create({ user_id: uid, consultant_id: 'c1', consultant_name: 'C', starts_at: new Date(), ends_at: new Date(), topic: 'T' });

    const s = await svc.deleteAccountData(uid);

    expect(await Device.countDocuments({ user_id: uid })).toBe(0);
    expect(await AIConversation.countDocuments({ user_id: uid })).toBe(0);
    expect(await Notification.countDocuments({ user_id: uid })).toBe(0);
    expect(await SavedItem.countDocuments({ user_id: uid })).toBe(0);
    expect(await Meeting.countDocuments({ user_id: uid })).toBe(0);
    expect(s.deleted.meetings).toBe(1);
  });
});

describe('deleteAccountData — documents (exclusive delete vs compliance retain)', () => {
  it('deletes an exclusively-personal private document + its versions and purges every S3 key', async () => {
    const u = await makeUser();
    const uid = u._id as Types.ObjectId;
    const { doc } = await makeVersionedDoc(uid); // private, no cert/app, no legal hold

    const s = await svc.deleteAccountData(uid);

    expect(await Document.countDocuments({ _id: doc._id }).setOptions({ includeDeleted: true } as any)).toBe(0);
    expect(await DocumentVersion.countDocuments({ document_id: doc._id })).toBe(0);
    // Both the main key and the thumbnail key were purged (all versions).
    expect(purgeSpy).toHaveBeenCalledWith(`orgs/none/docs/${doc._id}/v1-file.pdf`);
    expect(purgeSpy).toHaveBeenCalledWith(`orgs/none/docs/${doc._id}/v1-thumb.jpg`);
    expect(s.deleted.documents).toBe(1);
  });

  it('RETAINS a compliance document (linked to an application) and never purges its S3', async () => {
    const u = await makeUser();
    const uid = u._id as Types.ObjectId;
    const { doc } = await makeVersionedDoc(uid, { visibility: 'org', application_ids: [new Types.ObjectId()] });

    await svc.deleteAccountData(uid);

    expect(await Document.countDocuments({ _id: doc._id })).toBe(1); // preserved
    expect(purgeSpy).not.toHaveBeenCalled();
  });

  it('RETAINS a document on legal hold even if otherwise private', async () => {
    const u = await makeUser();
    const uid = u._id as Types.ObjectId;
    const { doc } = await makeVersionedDoc(uid, { is_legal_hold: true });

    await svc.deleteAccountData(uid);

    expect(await Document.countDocuments({ _id: doc._id })).toBe(1);
    expect(purgeSpy).not.toHaveBeenCalled();
  });
});

describe('deleteAccountData — leads', () => {
  it('deletes a standalone personal lead, anonymizes one linked to a business record', async () => {
    const u = await makeUser();
    const uid = u._id as Types.ObjectId;
    const standalone = await Lead.create({ service_id: 'bis', service_name: 'BIS', user_id: uid, contact_name: 'Farhan', contact_email: 'f@x.com', contact_phone: '+91999', company_name: 'Acme' });
    const linked = await Lead.create({ service_id: 'bis', service_name: 'BIS', user_id: uid, contact_name: 'Farhan', contact_email: 'f@x.com', contact_phone: '+91999', converted_application_id: new Types.ObjectId() });

    const s = await svc.deleteAccountData(uid);

    expect(await Lead.countDocuments({ _id: standalone._id })).toBe(0); // deleted
    const kept: any = await Lead.findById(linked._id).lean();
    expect(kept).toBeTruthy();                        // retained (linked to an application)
    expect(kept.contact_name).toBe('Deleted User');   // but personal fields scrubbed
    expect(kept.contact_email).toBe(anon(uid));
    expect(kept.contact_phone == null).toBe(true);
    expect(kept.company_name == null).toBe(true);
    expect(s.deleted.leads).toBe(1);
    expect(s.anonymized.leads).toBe(1);
  });
});

describe('deleteAccountData — support tickets keep the two-party shell', () => {
  it('scrubs the ticket + the user’s messages/attachments but keeps staff replies', async () => {
    const u = await makeUser();
    const uid = u._id as Types.ObjectId;
    const t = await SupportTicket.create({ user_id: uid, ticket_number: 'T-1', subject: 'My real subject', description: 'my private details', category: 'billing', source: 'support_center' });
    await TicketMessage.create({ ticket_id: t._id, sender_id: uid, sender_role: 'user', body: 'my personal message', attachments: [{ name: 'id.pdf', url: 'https://x/id.pdf' }] });
    const staffId = new Types.ObjectId();
    await TicketMessage.create({ ticket_id: t._id, sender_id: staffId, sender_role: 'staff', body: 'staff reply — business record' });

    await svc.deleteAccountData(uid);

    const ticket: any = await SupportTicket.findById(t._id).lean();
    expect(ticket).toBeTruthy();                                   // shell retained
    expect(ticket.subject).toBe('[removed at account deletion]');
    expect(ticket.description).toBe('[removed at account deletion]');
    const userMsg: any = await TicketMessage.findOne({ ticket_id: t._id, sender_role: 'user' }).lean();
    expect(userMsg.body).toBe('[removed at account deletion]');
    expect(userMsg.attachments).toEqual([]);                       // personal attachment removed
    const staffMsg: any = await TicketMessage.findOne({ ticket_id: t._id, sender_role: 'staff' }).lean();
    expect(staffMsg.body).toBe('staff reply — business record');   // staff message intact
  });
});

describe('deleteAccountData — CBRequest & PartnerApplication', () => {
  it('scrubs CBRequest free-text but preserves the workflow record', async () => {
    const u = await makeUser();
    const uid = u._id as Types.ObjectId;
    const cb = await CBRequest.create({ request_number: 'CB-1', user_id: uid, certification_body_id: new Types.ObjectId(), message: 'personal free text', status: 'submitted' });

    await svc.deleteAccountData(uid);

    const kept: any = await CBRequest.findById(cb._id).lean();
    expect(kept).toBeTruthy();
    expect(kept.message == null).toBe(true);      // personal free-text removed
    expect(kept.status).toBe('submitted');        // workflow preserved
  });

  it('anonymizes PartnerApplication contact PII and drops personal documents', async () => {
    const u = await makeUser();
    const uid = u._id as Types.ObjectId;
    const pa = await PartnerApplication.create({ user_id: uid, partner_type: 'cb', company_name: 'LabCo', contact_name: 'Farhan', email: 'f@x.com', phone: '+91999', documents: [{ name: 'lic.pdf', url: 'https://x/lic.pdf' }], status: 'pending' });

    await svc.deleteAccountData(uid);

    const kept: any = await PartnerApplication.findById(pa._id).lean();
    expect(kept).toBeTruthy();
    expect(kept.contact_name).toBe('Deleted User');
    expect(kept.email).toBe(anon(uid));
    expect(kept.phone == null).toBe(true);
    expect(kept.documents).toEqual([]);
    expect(kept.status).toBe('pending');          // decision shell preserved
  });
});

describe('deleteAccountData — user anonymization & shared-record protection', () => {
  it('anonymizes the User and unsets business-profile PII', async () => {
    const u = await makeUser({ company_name: 'Acme Pvt', gst_number: '22AAAAA0000A1Z5', business_role: 'owner', address: { city: 'Pune' } });
    const uid = u._id as Types.ObjectId;

    const s = await svc.deleteAccountData(uid);

    const raw: any = await User.findById(uid).setOptions({ includeDeleted: true } as any).lean();
    expect(raw.deleted_at).toBeTruthy();
    expect(raw.name).toBe('Deleted User');
    expect(raw.email).toBe(anon(uid));
    expect(raw.company_name == null).toBe(true);
    expect(raw.gst_number == null).toBe(true);
    expect(raw.business_role == null).toBe(true);
    expect(s.anonymized.user).toBe(true);
  });

  it('never deletes shared Organization or financial Payment records', async () => {
    const u = await makeUser();
    const uid = u._id as Types.ObjectId;
    const org = await Organization.create({ name: 'Shared Org', owner_user_id: uid });
    const pay = await Payment.create({ user_id: uid, description: 'fee', purpose: 'application_fee', amount_paise: 100, total_paise: 100, currency: 'INR' });

    await svc.deleteAccountData(uid);

    expect(await Organization.countDocuments({ _id: org._id })).toBe(1); // preserved
    expect(await Payment.countDocuments({ _id: pay._id })).toBe(1);      // retained (financial)
  });
});

describe('deleteAccountData — idempotent & safe', () => {
  it('runs twice with no error and no data resurrected', async () => {
    const u = await makeUser();
    const uid = u._id as Types.ObjectId;
    await Meeting.create({ user_id: uid, consultant_id: 'c', consultant_name: 'C', starts_at: new Date(), ends_at: new Date(), topic: 'T' });

    await svc.deleteAccountData(uid);
    const second = await svc.deleteAccountData(uid); // no throw

    expect(second.deleted.meetings).toBe(0);
    expect(await Meeting.countDocuments({ user_id: uid })).toBe(0);
  });

  it('a failing S3 purge does not leave the personal document record behind', async () => {
    purgeSpy.mockRejectedValue(new Error('S3 down'));
    const u = await makeUser();
    const uid = u._id as Types.ObjectId;
    const { doc } = await makeVersionedDoc(uid);

    const s = await svc.deleteAccountData(uid);

    expect(await Document.countDocuments({ _id: doc._id }).setOptions({ includeDeleted: true } as any)).toBe(0);
    expect(await DocumentVersion.countDocuments({ document_id: doc._id })).toBe(0);
    expect(s.s3.keysFailed).toBeGreaterThan(0); // failure counted, deletion still completed
  });
});
