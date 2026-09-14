/**
 * Socket.io authentication + per-room authorization (H2).
 *
 * The live Socket.io server (src/index.ts) previously accepted anonymous
 * connections and allowed arbitrary `join_org` / `join_application` /
 * `join_ticket` joins, so any client could subscribe to another user's real-time
 * events (confirmed leak: support-ticket messages). This enforces the model
 * SERVER-SIDE, reusing the exact primitives the REST layer trusts:
 *   • JWT verification pinned to HS256 with JWT_SECRET (as authMongo).
 *   • Session revocation via the shared Redis jti denylist.
 *   • The same role/ownership rules the REST routes use.
 * Fails CLOSED: missing/invalid token, unknown room, bad id, missing resource,
 * or any lookup error → DENY.
 */
import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { User, IUser } from '../models';
import { SupportTicket } from '../models/SupportTicket';
import { Application } from '../models/Application';
import { isJtiDenylisted } from '../utils/tokenDenylist';
import { ADMIN_ROLES } from './authMongo';
import { logger } from '../utils/logger';

const JWT_ALGORITHM: jwt.Algorithm = 'HS256';
const APP_STAFF_ROLES = ['admin', 'super_admin', 'employee'];

interface AccessTokenPayload { sub: string; org?: string; role: string; jti: string; scope?: string }

export type RoomKind = 'ticket' | 'app' | 'org' | 'user';
export const roomFor = (kind: RoomKind, id: string): string => `${kind}:${id}`;

/** Socket.io handshake middleware — authenticates the connection or denies. */
export async function authenticateSocket(socket: Socket, next: (err?: Error) => void): Promise<void> {
  try {
    const raw =
      (socket.handshake.auth && (socket.handshake.auth as any).token) ||
      (typeof socket.handshake.headers?.authorization === 'string' && socket.handshake.headers.authorization.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.slice(7)
        : undefined);
    if (!raw) return next(new Error('unauthenticated'));

    const payload = jwt.verify(raw, process.env.JWT_SECRET!, { algorithms: [JWT_ALGORITHM] }) as AccessTokenPayload;
    if (payload.scope) return next(new Error('insufficient_scope'));   // limited tokens are not sessions
    if (await isJtiDenylisted(payload.jti)) return next(new Error('token_revoked'));

    const user = await User.findById(payload.sub);
    if (!user) return next(new Error('invalid_token'));
    socket.data.user = user;
    return next();
  } catch (err: any) {
    logger.warn(`[socket] auth rejected: ${err?.message ?? 'error'}`);
    return next(new Error('unauthorized'));
  }
}

/** Authorize a room join. Fails CLOSED. Rules mirror the REST routes. */
export async function canJoinRoom(user: IUser | undefined, kind: RoomKind, id: unknown): Promise<boolean> {
  if (!user) return false;
  if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) return false;
  const role = user.role;
  const selfId = String((user as any)._id);
  try {
    switch (kind) {
      case 'user':
        return id === selfId;
      case 'org':
        if (ADMIN_ROLES.includes(role as any)) return true;                 // admins platform-wide
        return !!(user as any).org_id && String((user as any).org_id) === id;
      case 'app': {
        // Mirrors applications.ts scopeById: staff platform-wide; else creator/assignee.
        if (APP_STAFF_ROLES.includes(role)) return (await Application.exists({ _id: id })) != null;
        return (await Application.exists({ _id: id, $or: [{ created_by: selfId }, { assignees: selfId }] })) != null;
      }
      case 'ticket': {
        // Mirrors supportTickets.ts loadTicketFor: staff = ADMIN_ROLES; else owner.
        if (ADMIN_ROLES.includes(role as any)) return (await SupportTicket.exists({ _id: id })) != null;
        return (await SupportTicket.exists({ _id: id, user_id: selfId })) != null;
      }
      default:
        return false;
    }
  } catch (err: any) {
    logger.warn(`[socket] room authz error (fail-closed): ${err?.message ?? 'error'}`);
    return false;
  }
}
