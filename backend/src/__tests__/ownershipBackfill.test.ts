/**
 * Ownership Backfill + Dual-write — DB-backed tests (mongodb-memory-server).
 *
 * Covers the Sprint 3 guarantees:
 *   • dry-run writes nothing (rollback safety)
 *   • apply populates the typed axes from org_id / personal org / assignee roles
 *   • idempotency + duplicate execution → second run is all "skipped"
 *   • ambiguous ownership → "needs_manual_review", axis left null
 *   • never overwrites existing ownership
 *   • invalid (missing creator) is classified, not migrated
 *   • dual-write on create sets customer_id without breaking creation
 */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { User, Organization, Application } from '../models';
import { runOwnershipBackfill } from '../services/ownership/backfillService';
import { createDraftApplication } from '../services/applicationService';
import { deriveStaffAxesForUserIds } from '../services/ownership/dualWrite';

let mongoServer: MongoMemoryServer;
let appNo = 0;

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

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
});

// ── helpers ──────────────────────────────────────────────────────────────────
// Return `Promise<any>`: the spread object trips Mongoose's create() overload
// resolution (it picks the array overload → `never`); `any` keeps the tests
// readable without changing what is exercised.
const mkUser = (role: string, extra: Record<string, any> = {}): Promise<any> =>
  User.create({ email: `${role}-${Math.random().toString(36).slice(2)}@t.test`, name: role, role: role as any, otp_attempts: 0, ...extra });

const mkApp = (created_by: Types.ObjectId, extra: Record<string, any> = {}): Promise<any> =>
  Application.create({
    application_number: `APP-TEST-${String(++appNo).padStart(5, '0')}`,
    cert_type: 'bis',
    status: 'draft',
    created_by,
    assignees: [],
    ...extra,
  });

describe('runOwnershipBackfill — dry run (rollback safety)', () => {
  it('classifies without writing anything', async () => {
    const client = await mkUser('client');           // org-less → would need a personal org
    await mkApp(client._id as Types.ObjectId);

    const report = await runOwnershipBackfill({ dryRun: true });

    expect(report.dry_run).toBe(true);
    expect(report.total).toBe(1);
    expect(report.totals.migrated).toBe(1);
    expect(report.organizations_would_create).toBe(1);
    expect(report.organizations_created).toBe(0);

    // Nothing persisted: no org created, no customer_id set.
    expect(await Organization.countDocuments({})).toBe(0);
    const app = await Application.findOne({});
    expect(app!.customer_id).toBeFalsy();
  });
});

describe('runOwnershipBackfill — apply', () => {
  it('sets customer_id from org_id and does not create a personal org', async () => {
    const owner = await mkUser('client');
    const org = await Organization.create({ name: 'Acme', owner_user_id: owner._id });
    const app = await mkApp(owner._id as Types.ObjectId, { org_id: org._id });

    const report = await runOwnershipBackfill({ dryRun: false });
    expect(report.totals.migrated).toBe(1);
    expect(report.organizations_created).toBe(0);

    const fresh = await Application.findById(app._id);
    expect(String(fresh!.customer_id)).toBe(String(org._id));
    // No personal org created (the real org was reused).
    expect(await Organization.countDocuments({ is_personal: true })).toBe(0);
  });

  it('provisions a personal org for an org-less client', async () => {
    const client = await mkUser('client', { company_name: 'Solo Traders' });
    const app = await mkApp(client._id as Types.ObjectId);

    await runOwnershipBackfill({ dryRun: false });

    const personal = await Organization.findOne({ owner_user_id: client._id, is_personal: true });
    expect(personal).toBeTruthy();
    expect(personal!.name).toBe('Solo Traders');
    const fresh = await Application.findById(app._id);
    expect(String(fresh!.customer_id)).toBe(String(personal!._id));
  });

  it('derives a single consultant assignee into consultant_id', async () => {
    const client = await mkUser('client');
    const consultant = await mkUser('consultant');
    const org = await Organization.create({ name: 'Co', owner_user_id: client._id });
    const app = await mkApp(client._id as Types.ObjectId, {
      org_id: org._id,
      assignees: [consultant._id],
      primary_assignee: consultant._id,
    });

    await runOwnershipBackfill({ dryRun: false });

    const fresh = await Application.findById(app._id);
    expect(String(fresh!.consultant_id)).toBe(String(consultant._id));
  });
});

describe('runOwnershipBackfill — ambiguity is never guessed', () => {
  it('flags two consultants with no primary as needs_manual_review and leaves consultant_id null', async () => {
    const client = await mkUser('client');
    const c1 = await mkUser('consultant');
    const c2 = await mkUser('consultant');
    const org = await Organization.create({ name: 'Co', owner_user_id: client._id });
    const app = await mkApp(client._id as Types.ObjectId, { org_id: org._id, assignees: [c1._id, c2._id] });

    const report = await runOwnershipBackfill({ dryRun: false });
    expect(report.totals.needs_manual_review).toBe(1);

    const fresh = await Application.findById(app._id);
    expect(fresh!.consultant_id).toBeFalsy();     // ambiguous → not written
    expect(String(fresh!.customer_id)).toBe(String(org._id)); // unambiguous part still set
  });
});

describe('runOwnershipBackfill — idempotency & duplicate execution', () => {
  it('a second (and third) run changes nothing and reports all skipped', async () => {
    const client = await mkUser('client');
    await mkApp(client._id as Types.ObjectId);

    const first = await runOwnershipBackfill({ dryRun: false });
    expect(first.totals.migrated).toBe(1);
    const orgCountAfterFirst = await Organization.countDocuments({});

    const second = await runOwnershipBackfill({ dryRun: false });
    const third = await runOwnershipBackfill({ dryRun: false });

    expect(second.totals.skipped).toBe(1);
    expect(second.totals.migrated).toBe(0);
    expect(third.totals.skipped).toBe(1);
    // No duplicate personal orgs created on re-runs.
    expect(await Organization.countDocuments({})).toBe(orgCountAfterFirst);
  });
});

describe('runOwnershipBackfill — never overwrite / invalid', () => {
  it('does not overwrite an existing customer_id', async () => {
    const client = await mkUser('client');
    const preset = new Types.ObjectId();
    const app = await mkApp(client._id as Types.ObjectId, { customer_id: preset });

    const report = await runOwnershipBackfill({ dryRun: false });
    expect(report.totals.skipped).toBe(1);

    const fresh = await Application.findById(app._id);
    expect(String(fresh!.customer_id)).toBe(String(preset));
  });

  it('classifies an application whose creator no longer exists as invalid', async () => {
    await mkApp(new Types.ObjectId()); // created_by points at nobody

    const report = await runOwnershipBackfill({ dryRun: false });
    expect(report.totals.invalid).toBe(1);
    expect(report.records[0].issues.join(' ')).toMatch(/missing user/i);
  });
});

describe('dual-write on create', () => {
  it('sets customer_id to the user org when creating a draft', async () => {
    const owner = await mkUser('client');
    const org = await Organization.create({ name: 'Org', owner_user_id: owner._id });
    (owner as any).org_id = org._id;
    await owner.save();

    const app = await createDraftApplication({ user: owner as any, cert_type: 'bis' });
    expect(String(app.customer_id)).toBe(String(org._id));
    expect(String(app.created_by)).toBe(String(owner._id)); // legacy still authoritative
  });

  it('provisions a personal org when the creator is org-less', async () => {
    const client = await mkUser('client');
    const app = await createDraftApplication({ user: client as any, cert_type: 'bis' });
    const personal = await Organization.findOne({ owner_user_id: client._id, is_personal: true });
    expect(personal).toBeTruthy();
    expect(String(app.customer_id)).toBe(String(personal!._id));
  });
});

describe('dual-write on assign — role derivation helper', () => {
  it('derives typed axes from assignee ids by role', async () => {
    const consultant = await mkUser('consultant');
    const employee = await mkUser('employee');
    const axes = await deriveStaffAxesForUserIds([String(consultant._id), String(employee._id)]);
    expect(String(axes.consultant_id)).toBe(String(consultant._id));
    expect(String(axes.employee_id)).toBe(String(employee._id));
    expect(axes.manager_id).toBeUndefined();
  });
});
