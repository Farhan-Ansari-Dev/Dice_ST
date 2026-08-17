/**
 * Sign in with Apple — identity-token verification.
 *
 * Proves the security-critical checks: a token is only accepted when its RS256
 * signature verifies against Apple's JWKS AND its issuer + audience match. A
 * forged key, wrong audience, wrong issuer, or tampered token must be rejected.
 */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

process.env.APPLE_BUNDLE_ID = 'com.sanyogconformity.app';

import { verifyAppleIdentityToken } from '../routes/v2/auth';

// One RSA keypair stands in for Apple's signing key.
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'test-apple-key-1';
const jwk = { ...(publicKey.export({ format: 'jwk' }) as any), kid: KID, alg: 'RS256', use: 'sig' };

const sign = (payload: object, opts: jwt.SignOptions = {}) =>
  jwt.sign(payload, privateKey, { algorithm: 'RS256', keyid: KID, ...opts });

beforeEach(() => {
  // Mock Apple's JWKS endpoint to return our public key.
  (global as any).fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ keys: [jwk] }),
  }));
});
afterEach(() => jest.restoreAllMocks());

const base = {
  iss: 'https://appleid.apple.com',
  aud: 'com.sanyogconformity.app',
  sub: '001234.abcdef.0001',
  email: 'user@example.com',
  email_verified: 'true',
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

describe('verifyAppleIdentityToken', () => {
  it('accepts a correctly-signed token with valid issuer + audience', async () => {
    const claims = await verifyAppleIdentityToken(sign(base));
    expect(claims.sub).toBe('001234.abcdef.0001');
    expect(claims.email).toBe('user@example.com');
    expect(claims.email_verified).toBe(true);
  });

  it('rejects a wrong audience (token minted for another app)', async () => {
    await expect(verifyAppleIdentityToken(sign({ ...base, aud: 'com.someone.else' }))).rejects.toThrow();
  });

  it('rejects a wrong issuer', async () => {
    await expect(verifyAppleIdentityToken(sign({ ...base, iss: 'https://evil.example.com' }))).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    await expect(
      verifyAppleIdentityToken(sign({ ...base, exp: Math.floor(Date.now() / 1000) - 10 })),
    ).rejects.toThrow();
  });

  it('rejects a token signed by a different (forged) key', async () => {
    const attacker = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const forged = jwt.sign(base, attacker.privateKey, { algorithm: 'RS256', keyid: KID });
    await expect(verifyAppleIdentityToken(forged)).rejects.toThrow();
  });

  it('rejects a tampered token body', async () => {
    const token = sign(base);
    const [h, , s] = token.split('.');
    const evil = Buffer.from(JSON.stringify({ ...base, email: 'attacker@evil.com' })).toString('base64url');
    await expect(verifyAppleIdentityToken(`${h}.${evil}.${s}`)).rejects.toThrow();
  });

  it('rejects a malformed token', async () => {
    await expect(verifyAppleIdentityToken('not-a-jwt')).rejects.toThrow();
  });
});
