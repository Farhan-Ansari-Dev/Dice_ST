import { Request, Response, NextFunction } from 'express';

/**
 * Content Security Policy middleware.
 * Sets a strict CSP header allowing only required external resources.
 * Adjust the whitelist array if additional sources are needed.
 */
export const cspMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const whitelist = [
    "'self'",
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'https://www.google.com/recaptcha/',
    'https://www.gstatic.com/recaptcha/',
    'https://www.google-analytics.com',
  ];

  const policy = [
    `default-src ${whitelist[0]}`,
    `script-src ${whitelist.join(' ')}`,
    `style-src ${whitelist[0]} https://fonts.googleapis.com 'unsafe-inline'`,
    `font-src ${whitelist[0]} https://fonts.gstatic.com`,
    `img-src ${whitelist[0]} data:`,
    `connect-src ${whitelist[0]}`,
    `frame-src https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/`,
  ].join('; ');

  res.setHeader('Content-Security-Policy', policy);
  next();
};

/**
 * Hardening response headers (the set commonly provided by helmet).
 * Added as a separate middleware so the existing cspMiddleware stays untouched.
 * Note: HSTS is also enforced at the Cloudflare/Caddy edge; setting it here
 * guarantees the header even for non-proxied origins.
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  res.removeHeader('X-Powered-By');
  next();
};
