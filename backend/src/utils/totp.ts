/**
 * RFC 4226 (HOTP) / RFC 6238 (TOTP) — implemented natively on Node `crypto` to
 * avoid adding a third-party dependency for this security-critical primitive.
 * Secrets are Base32 (RFC 4648, no padding); verification is constant-time with a
 * small step window for clock skew. Nothing here logs secrets or codes.
 */
import crypto from 'crypto';

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(bytes = 20): string {
  return base32Encode(crypto.randomBytes(bytes));
}

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += B32_ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error('invalid base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}

export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (bin % 10 ** digits).toString().padStart(digits, '0');
}

export function totp(secretBase32: string, opts: { step?: number; digits?: number; t?: number } = {}): string {
  const step = opts.step ?? 30, digits = opts.digits ?? 6, t = opts.t ?? Date.now();
  return hotp(base32Decode(secretBase32), Math.floor(t / 1000 / step), digits);
}

/** Verify a code allowing ±`window` steps (default ±1 = ±30s). Constant-time. */
export function verifyTotp(
  secretBase32: string, code: string,
  opts: { step?: number; digits?: number; window?: number; t?: number } = {},
): boolean {
  const step = opts.step ?? 30, digits = opts.digits ?? 6, window = opts.window ?? 1, t = opts.t ?? Date.now();
  const submitted = String(code ?? '').trim();
  if (!/^\d+$/.test(submitted) || submitted.length !== digits) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(t / 1000 / step);
  for (let i = -window; i <= window; i++) {
    const candidate = hotp(secret, counter + i, digits);
    const a = Buffer.from(candidate), b = Buffer.from(submitted);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

export function buildOtpauthUri(secretBase32: string, accountLabel: string, issuer = 'DICE'): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({ secret: secretBase32, issuer, algorithm: 'SHA1', digits: '6', period: '30' });
  return `otpauth://totp/${label}?${params.toString()}`;
}
