/**
 * Reusable request-validation middleware built on zod.
 *
 * Server-side validation per CLAUDE.md ("Never trust frontend validation").
 * Validates any of body / query / params against a zod schema and returns a
 * uniform 400 on failure. Valid requests pass through unchanged — this adds a
 * guard in front of existing handlers without altering their success behavior.
 *
 * Usage:
 *   import { validate } from '../../middleware/validate';
 *   import { z } from 'zod';
 *
 *   const schema = { body: z.object({ email: z.string().email() }) };
 *   router.post('/send-otp', validate(schema), handler);
 */
import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';

export interface ValidationSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.body) req.body = schema.body.parse(req.body);
      if (schema.query) {
        // req.query is read-only in newer Express typings — validate without reassigning
        schema.query.parse(req.query);
      }
      if (schema.params) schema.params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'validation_error',
          message: 'Request validation failed',
          issues: err.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}
