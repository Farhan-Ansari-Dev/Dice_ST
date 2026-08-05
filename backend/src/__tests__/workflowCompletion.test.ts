/**
 * Workflow completion — DB-backed tests for the additive engines:
 *   • gates + SLA (advisory by default, blocking only when the flag is ON)
 *   • workflow override (bypasses the state machine, always audited)
 *   • assignment engine (assign / unassign / escalate + typed axes)
 *   • renewal workflow (create + idempotency + issuance chain linking)
 */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { User, Application, Workflow, Certification, Notification, Product } from '../models';
import { RemoteConfig } from '../models/RemoteConfig';
import { evaluate } from '../services/workflow/workflowEngine';
import { computeGateInput } from '../services/workflow/gates';
import { transition, GateDeniedError, issueCertification } from '../services/workflow/transitionService';
import { overrideStatus } from '../services/workflow/overrideService';
import { assignApplication, unassignApplication, escalateApplication } from '../services/assignment';
import { createRenewal, RenewalNotEligibleError } from '../services/renewalService';
import { clearFeatureFlagCache } from '../services/featureFlags';

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
  clearFeatureFlagCache();
});

const mkUser = (role: string): Promise<any> =>
  User.create({ email: `${role}-${Math.random().toString(36).slice(2)}@t.test`, name: role, role: role as any, otp_attempts: 0 });

const mkApp = (created_by: Types.ObjectId, extra: Record<string, any> = {}): Promise<any> =>
  Application.create({ application_number: `APP-WC-${String(++appNo).padStart(5, '0')}`, cert_type: 'bis', status: 'draft', created_by, assignees: [], ...extra });

const mkGatedWorkflow = () =>
  Workflow.create({
    _id: 'wf_wc_v1', cert_type: 'bis', display_name: 'WC', issuing_body: 'BIS',
    stages: [{ id: 'tech_review', label: 'Tech Review', sla_days: 7, required_docs: [{ doc_type: 'tr', label: 'Test Report', mandatory: true }] }],
  });

async function enableFlag(flag: string) {
  const cfg = await RemoteConfig.getGlobalConfig();
  (cfg.featureFlags as any)[flag] = true;
  await cfg.save();
  clearFeatureFlagCache();
}

describe('gates + SLA', () => {
  it('evaluate() surfaces gate actions and SLA advisorily without blocking', () => {
    const d = evaluate({ fromStatus: 'docs_review', toStatus: 'tech_review', actorRole: 'admin', gate: { missingMandatoryDocs: ['Test Report'], paymentDue: false, slaDays: 7 } });
    expect(d.allowed).toBe(true);
    expect(d.requiredActions).toContain('upload:Test Report');
    expect(d.sla).toEqual({ dueInDays: 7 });
  });

  it('transition proceeds (advisory) with the gate flag OFF and sets due_at from SLA', async () => {
    const admin = await mkUser('admin');
    await mkGatedWorkflow();
    const app = await mkApp(admin._id, { status: 'docs_review', workflow_id: 'wf_wc_v1' });
    await transition({ application: app, toStatus: 'tech_review', actor: admin._id, actorRole: 'admin' });
    expect(app.status).toBe('tech_review');
    expect(app.due_at).toBeInstanceOf(Date);
  });

  it('transition is BLOCKED with the gate flag ON when a mandatory doc is missing', async () => {
    const admin = await mkUser('admin');
    await mkGatedWorkflow();
    await enableFlag('workflow_gates_enforced');
    const app = await mkApp(admin._id, { status: 'docs_review', workflow_id: 'wf_wc_v1' });
    await expect(transition({ application: app, toStatus: 'tech_review', actor: admin._id, actorRole: 'admin' }))
      .rejects.toBeInstanceOf(GateDeniedError);
    expect(app.status).toBe('docs_review'); // unchanged
  });

  it('computeGateInput flags payment due on issuance when fee unpaid', async () => {
    const admin = await mkUser('admin');
    const app = await mkApp(admin._id, { status: 'approved', fee: { base_inr: 5000, expedited: false, paid: false } });
    const gate = await computeGateInput(app, 'cert_issued');
    expect(gate.paymentDue).toBe(true);
  });
});

describe('workflow override', () => {
  it('forces an otherwise-invalid transition and records it as an override', async () => {
    const admin = await mkUser('admin');
    const app = await mkApp(admin._id, { status: 'draft' });
    await overrideStatus({ application: app, toStatus: 'approved', actor: admin._id, reason: 'manual correction' });
    expect(app.status).toBe('approved');
    const last = app.status_history[app.status_history.length - 1];
    expect((last as any).override).toBe(true);
    expect(last.reason).toBe('manual correction');
  });

  it('requires a reason', async () => {
    const admin = await mkUser('admin');
    const app = await mkApp(admin._id, { status: 'draft' });
    await expect(overrideStatus({ application: app, toStatus: 'approved', actor: admin._id, reason: '  ' })).rejects.toThrow(/reason/);
  });
});

describe('assignment engine', () => {
  it('assigns, mirrors typed axes, notifies, then unassigns', async () => {
    const admin = await mkUser('admin');
    const consultant = await mkUser('consultant');
    const app = await mkApp(admin._id);

    await assignApplication({ application: app, userIds: [String(consultant._id)], primaryId: String(consultant._id), actor: admin._id });
    expect(String(app.consultant_id)).toBe(String(consultant._id));
    expect(app.assignees).toHaveLength(1);
    expect(await Notification.countDocuments({ user_id: consultant._id, type: 'app_assigned' })).toBe(1);

    await unassignApplication({ application: app, actor: admin._id });
    expect(app.assignees).toHaveLength(0);
    expect(app.consultant_id).toBeFalsy();
  });

  it('escalates to a manager and raises priority', async () => {
    const admin = await mkUser('admin');
    const manager = await mkUser('admin');
    const app = await mkApp(admin._id, { priority: 'medium' });
    await escalateApplication({ application: app, managerId: String(manager._id), actor: admin._id, reason: 'SLA breach' });
    expect(String(app.manager_id)).toBe(String(manager._id));
    expect(app.priority).not.toBe('medium');
  });
});

describe('renewal workflow', () => {
  async function seedCert() {
    const owner = await mkUser('client');
    const product = await Product.create({ name: 'Air Fryer', category: 'Electronics' });
    const sourceApp = await mkApp(owner._id, { status: 'cert_issued', product_id: product._id });
    const cert = await Certification.create({
      cert_number: `CM/${Date.now()}`, cert_type: 'bis', org_id: new Types.ObjectId(), product_id: sourceApp.product_id,
      application_id: sourceApp._id, issuing_body: 'BIS', scheme: 'IS', issue_date: new Date(), expiry_date: new Date(Date.now() + 1e9), validity_period_months: 24, status: 'active',
    });
    return { owner, cert };
  }

  it('creates a linked renewal application and is idempotent', async () => {
    const { cert } = await seedCert();
    const app = await createRenewal({ cert });
    expect(String(app.renewal_of_cert_id)).toBe(String(cert._id));
    expect(app.status).toBe('draft');
    await expect(createRenewal({ cert })).rejects.toBeInstanceOf(RenewalNotEligibleError);
  });

  it('issuance links the renewal chain and retires the predecessor', async () => {
    const { cert } = await seedCert();
    const renewalApp = await createRenewal({ cert });
    await issueCertification(renewalApp, renewalApp.created_by);

    const newCert = await Certification.findOne({ application_id: renewalApp._id });
    expect(String(newCert!.predecessor_cert_id)).toBe(String(cert._id));
    const oldCert = await Certification.findById(cert._id);
    expect(oldCert!.status).toBe('renewed');
    expect(String(oldCert!.successor_cert_id)).toBe(String(newCert!._id));
  });
});
