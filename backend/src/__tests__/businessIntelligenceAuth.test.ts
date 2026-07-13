/**
 * Business Intelligence authorization tests.
 *
 * BI reference data (countries, opportunities, guides, market trends,
 * government schemes) is global — any authenticated user may READ it, but only
 * admins may mutate it. These tests verify the authorize() guard applied to
 * non-GET requests in routes/v2/businessIntelligence.ts.
 */
import { authorize } from '../middleware/authorize';
import { AuthRequest } from '../middleware/authMongo';
import { Response } from 'express';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

const guard = authorize(['admin', 'super_admin'], { orgScoped: false });

describe('BusinessIntelligence write authorization', () => {
  it('rejects unauthenticated requests with 401', () => {
    const req = {} as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a client role with 403', () => {
    const req = { user: { role: 'client' } } as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a consultant role with 403', () => {
    const req = { user: { role: 'consultant' } } as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows an admin to proceed', () => {
    const req = { user: { role: 'admin' } } as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    guard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows a super_admin to proceed', () => {
    const req = { user: { role: 'super_admin' } } as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    guard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
