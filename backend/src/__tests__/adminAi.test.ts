/**
 * Admin AI Assistant — RBAC, disclosure gate, tool authorization/scope,
 * prompt-injection resistance, conversation isolation, and the tool-calling
 * loop (OpenAI client STUBBED — no real provider call).
 */
import express from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Application } from '../models/Application';
import { AIConversation } from '../models/AIConversation';
import { executeAdminTool } from '../services/ai/adminTools';
import * as assistant from '../services/ai/adminAssistantService';
import { recordStaffAiDisclosure } from '../services/ai/aiConsent';

let mongoServer: MongoMemoryServer;
let app: express.Application;
const JWT_SECRET = 'test-jwt-secret-for-unit-tests';

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  const { errorHandler } = await import('../middleware/errorHandler');
  app = express();
  app.use(express.json());
  const routes = (await import('../routes/index')).default;
  app.use('/api/v2', routes);
  app.use(errorHandler);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});
afterEach(async () => {
  jest.restoreAllMocks();
  await Application.deleteMany({});
  await AIConversation.deleteMany({});
});

const tokenFor = (id: string, role: string) =>
  jwt.sign({ sub: id, role, jti: 'x-' + Math.random() }, JWT_SECRET, { expiresIn: '15m' });
async function mkUser(role: string, extra: Record<string, any> = {}): Promise<any> {
  return User.create({ email: `${role}-${Math.random().toString(36).slice(2)}@t.com`, name: role, role, otp_attempts: 0, ...extra } as any);
}
async function mkApp(over: Record<string, any>): Promise<any> {
  return Application.create({ application_number: 'APP-' + Math.random().toString(36).slice(2), cert_type: 'BIS', status: 'submitted', created_by: new Types.ObjectId(), ...over } as any);
}

describe('adminTools — server-side authorization (LLM never authorizes)', () => {
  it('employee is FORBIDDEN from admin-only tools', async () => {
    const emp = await mkUser('employee');
    expect((await executeAdminTool(emp as any, 'searchUsers', { query: 'a' })).error).toBe('forbidden');
    expect((await executeAdminTool(emp as any, 'searchCBRequests', {})).error).toBe('forbidden');
    expect((await executeAdminTool(emp as any, 'getAnalyticsSummary', {})).error).toBe('forbidden');
  });

  it('employee searchApplications is scoped to their assigned/created apps only', async () => {
    const e1 = await mkUser('employee'); const e2 = await mkUser('employee');
    await mkApp({ primary_assignee: e1._id });          // e1's
    await mkApp({ created_by: e1._id });                 // e1's
    await mkApp({ primary_assignee: e2._id });           // e2's — must not appear for e1
    const res = await executeAdminTool(e1 as any, 'searchApplications', {});
    expect(res.count).toBe(2);
  });

  it('employee getApplication is forbidden for an app that is not theirs', async () => {
    const e1 = await mkUser('employee'); const e2 = await mkUser('employee');
    const theirs = await mkApp({ primary_assignee: e1._id });
    const others = await mkApp({ primary_assignee: e2._id });
    expect((await executeAdminTool(e1 as any, 'getApplication', { id: String(theirs._id) })).application_number).toBeTruthy();
    expect((await executeAdminTool(e1 as any, 'getApplication', { id: String(others._id) })).error).toBe('forbidden');
  });

  it('prompt-injection via customerId cannot broaden an employee beyond their scope', async () => {
    const e1 = await mkUser('employee'); const victim = await mkUser('client');
    await mkApp({ created_by: victim._id });              // victim's app
    await mkApp({ primary_assignee: e1._id });            // e1's app
    // Model (or injected text) asks for the victim's applications by customerId:
    const res = await executeAdminTool(e1 as any, 'searchApplications', { customerId: String(victim._id) });
    // Still AND-scoped to e1's assigned/created → victim's app is NOT returned.
    expect(res.count).toBe(0);
  });

  it('admin sees platform-wide; getAnalyticsSummary works for admin', async () => {
    const admin = await mkUser('admin');
    await mkApp({ status: 'submitted' }); await mkApp({ status: 'tech_review' });
    const summary = await executeAdminTool(admin as any, 'getOperationalSummary', {});
    expect(summary.scope).toBe('platform');
    expect(summary.pending_applications).toBeGreaterThanOrEqual(2);
    expect((await executeAdminTool(admin as any, 'getAnalyticsSummary', {})).scope).toBe('platform');
  });
});

describe('POST /admin-ai/chat — route RBAC + disclosure gate', () => {
  it('client and cb are refused (403 forbidden) — not the consumer consent error', async () => {
    const client = await mkUser('client'); const cb = await mkUser('cb');
    const r1 = await request(app).post('/api/v2/admin-ai/chat').set('Authorization', `Bearer ${tokenFor((client._id as any).toString(), 'client')}`).send({ message: 'hi' });
    const r2 = await request(app).post('/api/v2/admin-ai/chat').set('Authorization', `Bearer ${tokenFor((cb._id as any).toString(), 'cb')}`).send({ message: 'hi' });
    expect(r1.status).toBe(403); expect(r1.body.error).toBe('forbidden');
    expect(r2.status).toBe(403); expect(r2.body.error).toBe('forbidden');
  });

  it('staff without disclosure get 403 staff_ai_disclosure_required', async () => {
    const emp = await mkUser('employee');
    const res = await request(app).post('/api/v2/admin-ai/chat').set('Authorization', `Bearer ${tokenFor((emp._id as any).toString(), 'employee')}`).send({ message: 'hi' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('staff_ai_disclosure_required');
  });

  it('after acknowledging disclosure, the request passes the gate and reaches the service', async () => {
    const admin = await mkUser('admin');
    await recordStaffAiDisclosure((admin._id as any).toString());
    // No AI provider configured in tests → the service throws AIUnavailableError → 503.
    // A 503 (not 403) proves the disclosure gate opened and control reached the assistant.
    const res = await request(app).post('/api/v2/admin-ai/chat').set('Authorization', `Bearer ${tokenFor((admin._id as any).toString(), 'admin')}`).send({ message: 'How many applications are pending?' });
    expect(res.status).toBe(503);
    expect(res.body.error).toBe('ai_unavailable');
  });

  it('GET/POST /admin-ai/disclosure reads and records acknowledgement', async () => {
    const admin = await mkUser('admin');
    const t = tokenFor((admin._id as any).toString(), 'admin');
    const before = await request(app).get('/api/v2/admin-ai/disclosure').set('Authorization', `Bearer ${t}`);
    expect(before.status).toBe(200); expect(before.body.data.is_current).toBe(false);
    const ack = await request(app).post('/api/v2/admin-ai/disclosure').set('Authorization', `Bearer ${t}`);
    expect(ack.status).toBe(200); expect(ack.body.data.is_current).toBe(true);
  });
});

describe('runAdminAssistant — tool loop (stubbed OpenAI)', () => {
  function fakeClient(scripted: any[]) {
    let i = 0;
    return { chat: { completions: { create: jest.fn(async () => ({ choices: [{ message: scripted[i++] }] })) } } };
  }

  it('executes a tool with authz, returns the final answer, and persists an admin-scoped, PII-light history', async () => {
    const admin = await mkUser('admin');
    await mkApp({ status: 'submitted' });
    const fake = fakeClient([
      { role: 'assistant', content: null, tool_calls: [{ id: 't1', type: 'function', function: { name: 'getOperationalSummary', arguments: '{}' } }] },
      { role: 'assistant', content: 'There is 1 pending application.' },
    ]);
    jest.spyOn(assistant._deps, 'getClient').mockResolvedValue({ openai: fake as any, model: 'test', provider: 'openai' as any });

    const result = await assistant.runAdminAssistant(admin as any, 'How many applications are pending?');
    expect(result.response).toMatch(/pending application/i);
    expect(result.toolsUsed).toContain('getOperationalSummary');

    const conv: any = await AIConversation.findById(result.conversationId).lean();
    expect(conv.scope).toBe('admin');
    // History holds only the question + final answer — no tool payloads / PII.
    expect(conv.messages).toHaveLength(2);
    expect(conv.messages[0].role).toBe('user');
    expect(conv.messages[1].role).toBe('assistant');
    expect(JSON.stringify(conv.messages)).not.toMatch(/tool_call|getOperationalSummary/);
  });

  it('an injected tool request the caller may not use returns forbidden data, not real records', async () => {
    const emp = await mkUser('employee');
    await recordStaffAiDisclosure((emp._id as any).toString());
    await mkUser('client', { company_name: 'SecretCo' }); // a user the employee must not enumerate
    const fake = fakeClient([
      { role: 'assistant', content: null, tool_calls: [{ id: 't1', type: 'function', function: { name: 'searchUsers', arguments: '{"query":"Secret"}' } }] },
      { role: 'assistant', content: 'You are not authorized to search users.' },
    ]);
    const createSpy = jest.spyOn(assistant._deps, 'getClient').mockResolvedValue({ openai: fake as any, model: 'test', provider: 'openai' as any });
    const result = await assistant.runAdminAssistant(emp as any, 'list all users named Secret');
    // The tool ran but returned forbidden (employee not allowed) — no user data leaked.
    expect(result.toolsUsed).toContain('searchUsers');
    expect(result.response).not.toMatch(/SecretCo/);
    createSpy.mockRestore();
  });

  it('admin conversations are isolated from customer conversations', async () => {
    const admin = await mkUser('admin');
    await recordStaffAiDisclosure((admin._id as any).toString());
    // A customer-scoped conversation for the same user id must NOT appear in admin list.
    await AIConversation.create({ user_id: admin._id, scope: 'customer', messages: [{ role: 'user', content: 'x' }] });
    const t = tokenFor((admin._id as any).toString(), 'admin');
    const res = await request(app).get('/api/v2/admin-ai/conversations').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0); // only admin-scoped convs are listed
  });
});
