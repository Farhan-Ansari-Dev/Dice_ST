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
