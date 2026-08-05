/**
 * Workflow gates — computes the document / payment gate state and the SLA for a
 * proposed transition, from workflow-as-data (Workflow.stages) + the live
 * application. Pure-ish: one DB read for the workflow, no writes, no side
 * effects. The WorkflowEngine turns this into advisory `requiredActions`; only
 * when `workflow_gates_enforced` is ON does TransitionService block on it.
 */
import { Workflow } from '../../models';
import type { IApplication, ApplicationStatus } from '../../models/Application';
import type { GateInput } from './workflowEngine';

/**
 * Build the gate input for entering `toStatus`:
 *   • missingMandatoryDocs — mandatory docs the target stage requires that are
 *     not yet attached to the application for that stage.
 *   • paymentDue           — a fee is owed and issuance is being attempted.
 *   • slaDays              — SLA budget (days) for the stage being entered.
 */
export async function computeGateInput(app: IApplication, toStatus: ApplicationStatus): Promise<GateInput> {
  const workflow = app.workflow_id ? ((await Workflow.findById(app.workflow_id).lean()) as any) : null;
  const stage = (workflow?.stages as any[] | undefined)?.find((s) => s.id === toStatus);

  const requiredDocs: Array<{ doc_type: string; label: string; mandatory: boolean }> = stage?.required_docs ?? [];
  const providedLabels = new Set(
    (app.documents ?? [])
      .filter((d) => d.required_for_stage === toStatus)
      .map((d) => (d.label ?? '').trim().toLowerCase()),
  );
  const missingMandatoryDocs = requiredDocs
    .filter((d) => d.mandatory && !providedLabels.has((d.label ?? '').trim().toLowerCase()))
    .map((d) => d.label);

  // Payment gate: don't issue a certificate while a non-zero application fee is
  // unpaid. (Issuance is the money-sensitive step; earlier stages are free to
  // progress so document collection isn't blocked on payment.)
  const paymentDue = toStatus === 'cert_issued' && (app.fee?.base_inr ?? 0) > 0 && !app.fee?.paid;

  const slaDays = typeof stage?.sla_days === 'number' ? stage.sla_days : null;

  return { missingMandatoryDocs, paymentDue, slaDays };
}
