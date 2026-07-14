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
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ error: 'forbidden', required: allowedRoles });
      return;
    }
    if (orgScoped && userRole !== 'admin' && userRole !== 'super_admin') {
      (req as any).userOrgId = req.user.org_id?.toString();
    }
    if (disallowEmployeeEdit && userRole === 'employee') {
      const targetRole = (req.body as any).role;
      if (targetRole && targetRole === 'employee') {
        res.status(403).json({ error: 'employee_cannot_modify_employee' });
        return;
      }
    }
    next();
  };
};
