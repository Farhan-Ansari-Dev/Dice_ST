/**
 * Workflow routes — list available cert-type workflows.
 * Workflows are global config data, readable by any authenticated user.
 */
import { Router, Response } from 'express';
import { Workflow } from '../../models';
import { authenticate, AuthRequest, requireRole } from '../../middleware/authMongo';

const router = Router();
router.use(authenticate);

// List all active workflows (cert types)
router.get('/', async (req: AuthRequest, res: Response) => {
  const { country_code } = req.query;
  const filter: any = { active: true };
  if (country_code) filter.country_code = country_code;

  const workflows = await Workflow.find(filter).sort({ display_name: 1 }).lean();
  return res.json({ data: workflows });
});

// Get one workflow by cert_type or _id
router.get('/:identifier', async (req: AuthRequest, res: Response) => {
  const { identifier } = req.params;
  const workflow = await Workflow.findOne({
    $or: [{ _id: identifier }, { cert_type: identifier }],
    active: true,
  }).lean();
  if (!workflow) return res.status(404).json({ error: 'not_found' });
  return res.json({ data: workflow });
});

// Admin-only: create/update workflows
router.put('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const result = await Workflow.findByIdAndUpdate(
    req.params.id,
    { ...req.body, _id: req.params.id },
    { upsert: true, new: true }
  );
  return res.json({ data: result });
});

export default router;
