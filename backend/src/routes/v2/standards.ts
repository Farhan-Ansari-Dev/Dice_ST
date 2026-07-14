import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middleware/authMongo';
import { authorize as requireRole } from '../../middleware/authorize';
import { CertificationStandard } from '../../models/CertificationStandard';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';

const router = Router();

const documentRequirementSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  is_mandatory: z.boolean().optional(),
});

const standardSchema = z.object({
  certification_id: z.string().refine(isValidObjectId),
  country_code: z.string().length(2).transform(val => val.toUpperCase()),
  required_documents: z.array(documentRequirementSchema).optional(),
});

function handleAppError(res: Response, message: string, code: number) {
  return res.status(code).json({ success: false, message });
}

// GET /api/v2/standards - List all standards
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const standards = await CertificationStandard.find().populate('certification_id', 'name');
    res.json({ success: true, data: standards });
  } catch (error) {
    next(error);
  }
});

// GET /api/v2/standards/lookup - Find required docs for a cert and country
router.get('/lookup', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { certification_id, country_code } = req.query;

    if (!certification_id || !country_code) {
      return handleAppError(res, 'Certification ID and Country Code are required.', 400);
    }

    if (!isValidObjectId(certification_id as string)) {
      return handleAppError(res, 'Invalid Certification ID.', 400);
    }

    const standard = await CertificationStandard.findOne({
      certification_id: certification_id as string,
      country_code: (country_code as string).toUpperCase(),
    });

    if (!standard) {
      return res.json({ success: true, data: { required_documents: [] } });
    }

    res.json({ success: true, data: standard });
  } catch (error) {
    next(error);
  }
});

// POST /api/v2/standards - Create a new standard
router.post('/', authenticate, requireRole(['admin', 'super_admin']), async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = standardSchema.parse(req.body);
    const newStandard = new CertificationStandard({
      ...validatedData,
      created_by: req.user!._id,
      updated_by: req.user!._id,
    });
    await newStandard.save();
    res.status(201).json({ success: true, data: newStandard });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A standard for this certification and country already exists.' });
    }
    next(error);
  }
});

// PUT /api/v2/standards/:id - Update a standard
router.put('/:id', authenticate, requireRole(['admin', 'super_admin']), async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return handleAppError(res, 'Invalid ID.', 400);
    }
    const validatedData = standardSchema.partial().parse(req.body);
    const updatedStandard = await CertificationStandard.findByIdAndUpdate(
      id,
      { ...validatedData, updated_by: req.user!._id },
      { new: true, runValidators: true }
    );
    if (!updatedStandard) {
      return handleAppError(res, 'Standard not found.', 404);
    }
    res.json({ success: true, data: updatedStandard });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v2/standards/:id - Delete a standard
router.delete('/:id', authenticate, requireRole(['admin', 'super_admin']), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return handleAppError(res, 'Invalid ID.', 400);
    }
    const deletedStandard = await CertificationStandard.findByIdAndDelete(id);
    if (!deletedStandard) {
      return handleAppError(res, 'Standard not found.', 404);
    }
    res.json({ success: true, message: 'Standard deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
