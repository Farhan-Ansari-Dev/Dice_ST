/**
 * H2 — Socket.io handshake auth + per-room authorization (baseline).
 * Unauthenticated/invalid/revoked tokens rejected; room joins authorized against
 * the same ownership/role rules as REST; everything else fails CLOSED.
 */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User';
import { SupportTicket } from '../models/SupportTicket';
import { Application } from '../models/Application';
import { issueTokens } from '../middleware/authMongo';
import { denylistJti } from '../utils/tokenDenylist';
import { authenticateSocket, canJoinRoom } from '../middleware/socketAuth';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

const fakeSocket = (auth: any = {}, headers: any = {}) => ({ handshake: { auth, headers }, data: {} as any } as any);
const runAuth = (socket: any): Promise<{ ok: boolean }> =>
  new Promise((resolve) => authenticateSocket(socket, (err?: Error) => resolve({ ok: !err })));

describe('H2 — handshake authentication', () => {
  it('rejects no token / invalid token', async () => {
    expect((await runAuth(fakeSocket())).ok).toBe(false);
    expect((await runAuth(fakeSocket({ token: 'nope' }))).ok).toBe(false);
  });
  it('accepts a valid access token (auth field and Bearer header)', async () => {
    const user = await User.create({ email: 'sok@t.com', name: 'S', role: 'client', otp_attempts: 0 });
    const { accessToken } = issueTokens(user);
    const s = fakeSocket({ token: accessToken });
    expect((await runAuth(s)).ok).toBe(true);
    expect(String(s.data.user._id)).toBe(String(user._id));
    expect((await runAuth(fakeSocket({}, { authorization: `Bearer ${accessToken}` }))).ok).toBe(true);
  });
  it('rejects a revoked (denylisted) session', async () => {
    const user = await User.create({ email: 'rev@t.com', name: 'R', role: 'client', otp_attempts: 0 });
    const { accessToken } = issueTokens(user);
    const jwt = (await import('jsonwebtoken')).default;
    await denylistJti((jwt.decode(accessToken) as any).jti, 3600);
    expect((await runAuth(fakeSocket({ token: accessToken }))).ok).toBe(false);
  });
});

describe('H2 — room authorization', () => {
  it('ticket: owner ALLOW, other DENY, admin ALLOW, employee-non-owner DENY, missing/invalid DENY', async () => {
    const owner = await User.create({ email: 'to@t.com', name: 'O', role: 'client', otp_attempts: 0 });
    const other = await User.create({ email: 'tx@t.com', name: 'X', role: 'client', otp_attempts: 0 });
    const admin = await User.create({ email: 'ta@t.com', name: 'A', role: 'admin', otp_attempts: 0 });
    const emp = await User.create({ email: 'te@t.com', name: 'E', role: 'employee', otp_attempts: 0 });
    const tid = new Types.ObjectId();
    await SupportTicket.collection.insertOne({ _id: tid, user_id: owner._id, status: 'open' } as any);
    expect(await canJoinRoom(owner as any, 'ticket', String(tid))).toBe(true);
    expect(await canJoinRoom(other as any, 'ticket', String(tid))).toBe(false);
    expect(await canJoinRoom(admin as any, 'ticket', String(tid))).toBe(true);
    expect(await canJoinRoom(emp as any, 'ticket', String(tid))).toBe(false); // employees are not ticket-staff
    expect(await canJoinRoom(owner as any, 'ticket', String(new Types.ObjectId()))).toBe(false);
    expect(await canJoinRoom(owner as any, 'ticket', 'not-an-id')).toBe(false);
  });
  it('app: creator/assignee/staff ALLOW, unrelated DENY', async () => {
    const creator = await User.create({ email: 'ac@t.com', name: 'C', role: 'client', otp_attempts: 0 });
    const assignee = await User.create({ email: 'as@t.com', name: 'S', role: 'consultant', otp_attempts: 0 });
    const other = await User.create({ email: 'ax@t.com', name: 'X', role: 'client', otp_attempts: 0 });
    const emp = await User.create({ email: 'ae@t.com', name: 'E', role: 'employee', otp_attempts: 0 });
    const aid = new Types.ObjectId();
    await Application.collection.insertOne({ _id: aid, application_number: 'APP-H2-1', created_by: creator._id, assignees: [assignee._id], status: 'draft' } as any);
    expect(await canJoinRoom(creator as any, 'app', String(aid))).toBe(true);
    expect(await canJoinRoom(assignee as any, 'app', String(aid))).toBe(true);
    expect(await canJoinRoom(other as any, 'app', String(aid))).toBe(false);
    expect(await canJoinRoom(emp as any, 'app', String(aid))).toBe(true);
  });
  it('org: own ALLOW, cross DENY, admin any ALLOW; user: self only; unknown kind DENY', async () => {
    const org = new Types.ObjectId();
    const u = await User.create({ email: 'o@t.com', name: 'U', role: 'client', org_id: org, otp_attempts: 0 });
    const admin = await User.create({ email: 'oa@t.com', name: 'A', role: 'super_admin', otp_attempts: 0 });
    const other = await User.create({ email: 'ou@t.com', name: 'X', role: 'client', otp_attempts: 0 });
    expect(await canJoinRoom(u as any, 'org', String(org))).toBe(true);
    expect(await canJoinRoom(u as any, 'org', String(new Types.ObjectId()))).toBe(false);
    expect(await canJoinRoom(admin as any, 'org', String(new Types.ObjectId()))).toBe(true);
    expect(await canJoinRoom(u as any, 'user', String((u as any)._id))).toBe(true);
    expect(await canJoinRoom(u as any, 'user', String((other as any)._id))).toBe(false);
    expect(await canJoinRoom(u as any, 'bogus' as any, String(new Types.ObjectId()))).toBe(false);
    expect(await canJoinRoom(undefined, 'ticket', String(new Types.ObjectId()))).toBe(false);
  });
});
