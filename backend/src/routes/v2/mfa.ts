/**
 * MFA (TOTP) enrollment endpoints.
 *
 *   POST /mfa/setup   → secret + otpauth URI (secret returned once)
 *   POST /mfa/enable  { code } → activate MFA; issues a full session
 *   POST /mfa/disable { code } → deactivate (full session required)
 *   GET  /mfa/status  → { enabled }
 *
 * setup/enable accept EITHER a full session OR the limited `mfa_enroll` token
 * (so a mandatory-but-unenrolled admin can bootstrap). Every other route rejects
 * the enroll token (see authMongo.authenticate), so it can never bypass MFA.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest, issueTokens, verifyEnrollToken } from '../../middleware/authMongo';
import { User } from '../../models';
import { setupMfa, enableMfa, disableMfa, MfaError } from '../../services/mfaService';
import { serializeUser } from '../../utils/serializeUser';
import { makeLimiter } from '../../middleware/rateLimiters';

const router = Router();
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
const mfaCodeLimiter = makeLimiter('rl:mfa:', { windowMs: 15 * 60 * 1000, max: 20, message: { error: 'too_many_attempts' } });

/** Accept a full access token OR an mfa_enroll-scoped token (setup/enable only). */
async function authenticateForEnroll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'unauthenticated' }); return; }
  const token = header.slice(7);
  try {
    const { sub } = verifyEnrollToken(token);       // throws unless scope === 'mfa_enroll'
    const user = await User.findById(sub);
    if (!user) { res.status(401).json({ error: 'invalid_token' }); return; }
    req.user = user;
    next();
  } catch {
    authenticate(req, res, next);                   // fall back to a normal full session
  }
}

router.post('/setup', authenticateForEnroll, wrap(async (req: AuthRequest, res: Response) => {
  const label = req.user!.email || String(req.user!._id);
  try {
    const { secret, otpauthUri } = await setupMfa(String(req.user!._id), label);
    return res.json({ success: true, data: { secret, otpauthUri } });   // returned once, over TLS, never logged
  } catch (e) {
    if (e instanceof MfaError) return res.status(503).json({ success: false, error: 'mfa_unavailable', message: e.message });
    throw e;
  }
}));

router.post('/enable', authenticateForEnroll, mfaCodeLimiter, wrap(async (req: AuthRequest, res: Response) => {
  const code = String(req.body?.code ?? '').trim();
  if (!code) return res.status(400).json({ success: false, error: 'missing_code' });
  let ok = false;
  try { ok = await enableMfa(String(req.user!._id), code); }
  catch (e) { if (e instanceof MfaError) return res.status(400).json({ success: false, error: 'no_pending_enrollment', message: e.message }); throw e; }
  if (!ok) return res.status(401).json({ success: false, error: 'invalid_mfa_code' });
  const fresh = await User.findById(req.user!._id);
  const { accessToken, refreshToken } = issueTokens(fresh!);
  return res.json({ success: true, data: { accessToken, refreshToken, user: await serializeUser(fresh) } });
}));

router.post('/disable', authenticate, mfaCodeLimiter, wrap(async (req: AuthRequest, res: Response) => {
  const code = String(req.body?.code ?? '').trim();
  if (!code) return res.status(400).json({ success: false, error: 'missing_code' });
  const ok = await disableMfa(String(req.user!._id), code);
  if (!ok) return res.status(401).json({ success: false, error: 'invalid_mfa_code' });
  return res.json({ success: true, data: { enabled: false } });
}));

router.get('/status', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  return res.json({ success: true, data: { enabled: !!(req.user as any).totp_enabled } });
}));

export default router;
