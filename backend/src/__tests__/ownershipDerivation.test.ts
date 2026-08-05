/**
 * ownershipDerivation + ownershipValidation — pure unit tests (no DB).
 *
 * Locks in Sprint 3's inference rule (deny-ambiguity, primary_assignee tie-break)
 * and the read-only consistency checks.
 */
import { Types } from 'mongoose';
import { deriveStaffAxes } from '../services/ownership/ownershipDerivation';
import { checkOwnershipConsistency } from '../services/ownership/ownershipValidation';

const oid = () => new Types.ObjectId();

describe('deriveStaffAxes — role → slot mapping', () => {
  it('maps a single consultant / employee / admin to their slots', () => {
    const c = oid(), e = oid(), m = oid();
    const { axes, ambiguities } = deriveStaffAxes([
      { id: c, role: 'consultant' },
      { id: e, role: 'employee' },
      { id: m, role: 'admin' },
    ]);
    expect(axes.consultant_id!.equals(c)).toBe(true);
    expect(axes.employee_id!.equals(e)).toBe(true);
    expect(axes.manager_id!.equals(m)).toBe(true);
    expect(ambiguities).toHaveLength(0);
  });

  it('super_admin also maps to manager_id', () => {
    const m = oid();
    expect(deriveStaffAxes([{ id: m, role: 'super_admin' }]).axes.manager_id!.equals(m)).toBe(true);
  });

  it('ignores non-staff roles (client/viewer/cb/lab/ib)', () => {
    const { axes, ambiguities } = deriveStaffAxes([
      { id: oid(), role: 'client' },
      { id: oid(), role: 'viewer' },
    ]);
    expect(axes).toEqual({ consultant_id: null, employee_id: null, manager_id: null });
    expect(ambiguities).toHaveLength(0);
  });

  it('dedupes the same id appearing twice for a slot', () => {
    const c = oid();
    const { axes, ambiguities } = deriveStaffAxes([
      { id: c, role: 'consultant' },
      { id: c.toHexString(), role: 'consultant' },
    ]);
    expect(axes.consultant_id!.equals(c)).toBe(true);
    expect(ambiguities).toHaveLength(0);
  });

  it('flags ambiguity when two distinct consultants and no primary tie-break', () => {
    const { axes, ambiguities } = deriveStaffAxes([
      { id: oid(), role: 'consultant' },
      { id: oid(), role: 'consultant' },
    ]);
    expect(axes.consultant_id).toBeNull();
    expect(ambiguities).toHaveLength(1);
    expect(ambiguities[0].slot).toBe('consultant_id');
    expect(ambiguities[0].candidateCount).toBe(2);
  });

  it('resolves ambiguity when primary_assignee is one of the candidates', () => {
    const a = oid(), b = oid();
    const { axes, ambiguities } = deriveStaffAxes(
      [{ id: a, role: 'consultant' }, { id: b, role: 'consultant' }],
      b,
    );
    expect(axes.consultant_id!.equals(b)).toBe(true);
    expect(ambiguities).toHaveLength(0);
  });
});

describe('checkOwnershipConsistency — read-only drift detection', () => {
  it('reports missing customer_id as soft drift (still consistent)', () => {
    const r = checkOwnershipConsistency({ assignees: [], created_by: oid() });
    expect(r.consistent).toBe(true);
    expect(r.inconsistencies.some((i) => i.code === 'customer_missing')).toBe(true);
  });

  it('is consistent when typed axes are all present in assignees', () => {
    const c = oid();
    const r = checkOwnershipConsistency({
      customer_id: oid(),
      consultant_id: c,
      assignees: [c],
      primary_assignee: c,
    });
    expect(r.consistent).toBe(true);
    expect(r.inconsistencies).toHaveLength(0);
  });

  it('flags a typed axis that is not among legacy assignees (hard drift)', () => {
    const r = checkOwnershipConsistency({
      customer_id: oid(),
      consultant_id: oid(), // not in assignees
      assignees: [oid()],
    });
    expect(r.consistent).toBe(false);
    expect(r.inconsistencies.some((i) => i.code === 'staff_axis_not_in_assignees')).toBe(true);
  });
});
