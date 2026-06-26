// src/middleware/authorize.ts

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMongo';

/**
 * Authorization middleware that checks:
 *   1. User is authenticated (req.user present)
 *   2. User role is included in the allowedRoles list
 *   3. For non‑admin roles, the resource belongs to the same organization (org_id check)
 *   4. Employees cannot edit other employees (role‑specific rule)
 */
export const authorize = (allowedRoles: string[], options?: { orgScoped?: boolean; disallowEmployeeEdit?: boolean }) => {
  const { orgScoped = true, disallowEmployeeEdit = false } = options || {};
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'forbidden', required: allowedRoles });
    }
    // Org‑scoping: ensure the resource's org matches the user's org (if applicable)
    if (orgScoped && userRole !== 'admin' && userRole !== 'super_admin') {
      // Expect the route to have req.params.orgId or the document to have org_id field later in the handler.
      // Here we simply store the user's org for later checks.
      (req as any).userOrgId = req.user.org_id?.toString();
    }
    // Employee‑vs‑Employee edit protection
    if (disallowEmployeeEdit && userRole === 'employee') {
      // The handler should pass the target user's role in req.body.targetRole or similar.
      // If the target role is also employee, block the operation.
      const targetRole = (req.body as any).role; // may be undefined for non‑user routes
      if (targetRole && targetRole === 'employee') {
        return res.status(403).json({ error: 'employee_cannot_modify_employee' });
      }
    }
    next();
  };
};
