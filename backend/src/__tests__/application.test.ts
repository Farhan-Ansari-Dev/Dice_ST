/**
 * Application State Machine Tests
 *
 * Tests the core business logic: allowed status transitions,
 * transition validation, and history tracking.
 */
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';
import { Application, ALLOWED_TRANSITIONS, ApplicationStatus } from '../models/Application';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Product } from '../models/Product';
import mongoose from 'mongoose';

let userId: mongoose.Types.ObjectId;
let orgId: mongoose.Types.ObjectId;
let productId: mongoose.Types.ObjectId;

beforeAll(async () => {
  await setupTestDB();

  // Create prerequisite records
  const user = await User.create({
    email: 'test@example.com',
    name: 'Test User',
    role: 'client',
  });
  userId = user._id as mongoose.Types.ObjectId;

  const org = await Organization.create({
    name: 'Test Corp',
    type: 'manufacturer',
    owner_user_id: userId,
  });
  orgId = org._id as mongoose.Types.ObjectId;
  user.org_id = orgId;
  await user.save();

  const product = await Product.create({
    name: 'USB Charger',
    org_id: orgId,
    category: 'Electronics',
  });
  productId = product._id as mongoose.Types.ObjectId;
});

afterEach(async () => {
  await Application.deleteMany({});
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Application State Machine', () => {
  const createApp = (status: ApplicationStatus = 'draft') =>
    Application.create({
      application_number: `APP-TEST-${Date.now()}`,
      org_id: orgId,
      product_id: productId,
      workflow_id: 'wf_bis_crs_v1',
      cert_type: 'BIS_CRS',
      status,
      created_by: userId,
    });

  describe('ALLOWED_TRANSITIONS', () => {
    test('draft can only transition to submitted or cancelled', () => {
      expect(ALLOWED_TRANSITIONS.draft).toEqual(['submitted', 'cancelled']);
    });

    test('cert_issued is a terminal state', () => {
      expect(ALLOWED_TRANSITIONS.cert_issued).toEqual([]);
    });

    test('rejected is a terminal state', () => {
      expect(ALLOWED_TRANSITIONS.rejected).toEqual([]);
    });

    test('cancelled is a terminal state', () => {
      expect(ALLOWED_TRANSITIONS.cancelled).toEqual([]);
    });

    test('all statuses are accounted for', () => {
      const allStatuses: ApplicationStatus[] = [
        'draft', 'submitted', 'docs_review', 'docs_required',
        'tech_review', 'testing', 'approval_pending', 'approved',
        'rejected', 'on_hold', 'cert_issued', 'cancelled',
      ];
      for (const status of allStatuses) {
        expect(ALLOWED_TRANSITIONS).toHaveProperty(status);
      }
    });
  });

  describe('canTransitionTo()', () => {
    test('draft → submitted is allowed', async () => {
      const app = await createApp('draft');
      expect(app.canTransitionTo('submitted')).toBe(true);
    });

    test('draft → approved is NOT allowed (skips stages)', async () => {
      const app = await createApp('draft');
      expect(app.canTransitionTo('approved')).toBe(false);
    });

    test('cert_issued → any is NOT allowed (terminal)', async () => {
      const app = await createApp('cert_issued');
      expect(app.canTransitionTo('draft')).toBe(false);
      expect(app.canTransitionTo('submitted')).toBe(false);
    });
  });

  describe('transitionTo()', () => {
    test('valid transition updates status and appends history', async () => {
      const app = await createApp('draft');
      app.transitionTo('submitted', userId, { reason: 'Ready for review' });

      expect(app.status).toBe('submitted');
      expect(app.status_history).toHaveLength(1);
      expect(app.status_history[0].from).toBe('draft');
      expect(app.status_history[0].to).toBe('submitted');
      expect(app.status_history[0].reason).toBe('Ready for review');
      expect(app.submitted_at).toBeDefined();
    });

    test('invalid transition throws error', async () => {
      const app = await createApp('draft');
      expect(() => app.transitionTo('approved', userId)).toThrow(
        'Invalid transition draft → approved'
      );
    });

    test('completing sets completed_at', async () => {
      const app = await createApp('approved');
      app.transitionTo('cert_issued', userId);

      expect(app.status).toBe('cert_issued');
      expect(app.completed_at).toBeDefined();
    });

    test('full happy path: draft → submitted → ... → cert_issued', async () => {
      const app = await createApp('draft');

      app.transitionTo('submitted', userId);
      expect(app.status).toBe('submitted');

      app.transitionTo('docs_review', userId);
      expect(app.status).toBe('docs_review');

      app.transitionTo('tech_review', userId);
      expect(app.status).toBe('tech_review');

      app.transitionTo('testing', userId);
      expect(app.status).toBe('testing');

      app.transitionTo('approval_pending', userId);
      expect(app.status).toBe('approval_pending');

      app.transitionTo('approved', userId);
      expect(app.status).toBe('approved');

      app.transitionTo('cert_issued', userId);
      expect(app.status).toBe('cert_issued');

      expect(app.status_history).toHaveLength(7);
    });
  });

  describe('Soft delete', () => {
    test('find() excludes soft-deleted records', async () => {
      const app = await createApp('draft');
      await Application.updateOne({ _id: app._id }, { deleted_at: new Date() });

      const found = await Application.find({});
      expect(found).toHaveLength(0);
    });
  });
});
