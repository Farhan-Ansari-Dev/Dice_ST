/**
 * OwnershipService — pure unit tests (no DB, no I/O).
 *
 * Locks in Sprint 2's ownership foundation: normalization of the typed ownership
 * axes, the relationship helpers, and the (not-yet-wired) canAccessApplication
 * target-model visibility rule.
 */
import { Types } from 'mongoose';
import {
  toObjectId,
  idEquals,
  normalizeOwnership,
  getOwnership,
  getAssignmentIds,
  isCustomer,
  isConsultant,
  isEmployee,
  isManager,
  isAssignee,
  isCreator,
  canAccessApplication,
  type OwnershipSource,
  type AccessActor,
} from '../services/ownership';

const oid = () => new Types.ObjectId();

describe('OwnershipService — toObjectId / idEquals', () => {
  it('passes through an ObjectId unchanged', () => {
    const id = oid();
    expect(toObjectId(id)!.equals(id)).toBe(true);
  });

  it('parses a valid hex string', () => {
    const id = oid();
    expect(toObjectId(id.toHexString())!.equals(id)).toBe(true);
  });

  it('reads _id from a populated document', () => {
    const id = oid();
    expect(toObjectId({ _id: id, name: 'x' } as any)!.equals(id)).toBe(true);
  });

  it('returns null for null / undefined / invalid', () => {
    expect(toObjectId(null)).toBeNull();
    expect(toObjectId(undefined)).toBeNull();
    expect(toObjectId('not-an-id')).toBeNull();
  });

  it('idEquals only matches two real, equal ids', () => {
    const a = oid();
    expect(idEquals(a, a.toHexString())).toBe(true);
    expect(idEquals(a, oid())).toBe(false);
    expect(idEquals(null, null)).toBe(false);
    expect(idEquals(a, null)).toBe(false);
  });
});

describe('OwnershipService — normalize / read', () => {
  it('normalizes only the five ownership axes and ignores legacy fields', () => {
    const customer = oid();
    const consultant = oid();
    const employee = oid();
    const manager = oid();
    const creator = oid();

    const src: OwnershipSource = {
      customer_id: customer.toHexString(),
      consultant_id: consultant,
      employee_id: employee,
      manager_id: manager,
      created_by: creator,
      // legacy — must NOT appear in normalized ownership
      assignees: [oid()],
      primary_assignee: oid(),
      org_id: oid(),
    };

    const own = getOwnership(src);
    expect(own.customer_id!.equals(customer)).toBe(true);
    expect(own.consultant_id!.equals(consultant)).toBe(true);
    expect(own.employee_id!.equals(employee)).toBe(true);
    expect(own.manager_id!.equals(manager)).toBe(true);
    expect(own.created_by!.equals(creator)).toBe(true);
    expect(Object.keys(own).sort()).toEqual(
      ['consultant_id', 'created_by', 'customer_id', 'employee_id', 'manager_id'],
    );
  });

  it('missing axes normalize to null', () => {
    expect(normalizeOwnership({})).toEqual({
      customer_id: null,
      consultant_id: null,
      employee_id: null,
      manager_id: null,
      created_by: null,
    });
  });

  it('getAssignmentIds unions assignees + primary_assignee and dedupes', () => {
    const a = oid();
    const b = oid();
    const ids = getAssignmentIds({ assignees: [a, b, a.toHexString()], primary_assignee: b });
    expect(ids).toHaveLength(2);
    expect(ids.some((x) => x.equals(a))).toBe(true);
    expect(ids.some((x) => x.equals(b))).toBe(true);
  });
});

describe('OwnershipService — relationship helpers', () => {
  const customerOrg = oid();
  const consultant = oid();
  const employee = oid();
  const manager = oid();
  const creator = oid();
  const assignee = oid();

  const app: OwnershipSource = {
    customer_id: customerOrg,
    consultant_id: consultant,
    employee_id: employee,
    manager_id: manager,
    created_by: creator,
    assignees: [assignee],
  };

  it('isCustomer matches the actor via their org_id', () => {
    expect(isCustomer(app, { _id: oid(), role: 'client', org_id: customerOrg })).toBe(true);
    expect(isCustomer(app, { _id: oid(), role: 'client', org_id: oid() })).toBe(false);
  });

  it('isConsultant / isEmployee / isManager match the respective axis', () => {
    expect(isConsultant(app, { _id: consultant, role: 'consultant' })).toBe(true);
    expect(isEmployee(app, { _id: employee, role: 'employee' })).toBe(true);
    expect(isManager(app, { _id: manager, role: 'admin' })).toBe(true);
    expect(isConsultant(app, { _id: employee, role: 'consultant' })).toBe(false);
  });

  it('isAssignee reads legacy assignment fields; isCreator reads created_by', () => {
    expect(isAssignee(app, { _id: assignee, role: 'consultant' })).toBe(true);
    expect(isCreator(app, { _id: creator, role: 'client' })).toBe(true);
    expect(isCreator(app, { _id: oid(), role: 'client' })).toBe(false);
  });
});

describe('OwnershipService — canAccessApplication (target model, not yet wired)', () => {
  const customerOrg = oid();
  const consultant = oid();
  const employee = oid();
  const manager = oid();
  const creator = oid();

  const app: OwnershipSource = {
    customer_id: customerOrg,
    consultant_id: consultant,
    employee_id: employee,
    manager_id: manager,
    created_by: creator,
    assignees: [],
  };

  it('super_admin and admin always have access', () => {
    expect(canAccessApplication(app, { _id: oid(), role: 'super_admin' })).toBe(true);
    expect(canAccessApplication(app, { _id: oid(), role: 'admin' })).toBe(true);
  });

  it('employee: access only when assigned / managing', () => {
    expect(canAccessApplication(app, { _id: employee, role: 'employee' })).toBe(true);
    expect(canAccessApplication(app, { _id: manager, role: 'employee' })).toBe(true);
    expect(canAccessApplication(app, { _id: oid(), role: 'employee' })).toBe(false);
  });

  it('consultant: access only when servicing the application', () => {
    expect(canAccessApplication(app, { _id: consultant, role: 'consultant' })).toBe(true);
    expect(canAccessApplication(app, { _id: oid(), role: 'consultant' })).toBe(false);
  });

  it('client: access via customer org, with created_by as compat fallback', () => {
    // owns via customer organization
    expect(canAccessApplication(app, { _id: oid(), role: 'client', org_id: customerOrg })).toBe(true);
    // compat fallback: the original creator, before customer_id backfill
    expect(canAccessApplication({ created_by: creator }, { _id: creator, role: 'client' })).toBe(true);
    // a different client sees nothing
    expect(canAccessApplication(app, { _id: oid(), role: 'client', org_id: oid() })).toBe(false);
  });

  it('viewer / cb / lab / ib have no default access, and a missing actor is denied', () => {
    expect(canAccessApplication(app, { _id: oid(), role: 'viewer' })).toBe(false);
    expect(canAccessApplication(app, { _id: oid(), role: 'lab' })).toBe(false);
    expect(canAccessApplication(app, null)).toBe(false);
  });
});
