import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { User } from '../../models/User';
import { sendSuccess, sendError } from '../../utils/response';
import { isValidObjectId } from 'mongoose';
import { AuthRequest } from '../../middleware/authMongo';

const router = Router();

/**
 * @route   POST /api/v2/consultants/request-verification
 * @desc    Allows a consultant to submit a verification request
 * @access  Private (Consultant)
 */
router.post(
  '/request-verification',
  authorize(['consultant']),
  async (req: AuthRequest, res, next) => {
    try {
      const { documents } = req.body;

      if (!req.user) {
        return sendError(res, 'User not found', 404);
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      user.consultant_verification_status = 'pending';
      if (documents) {
        user.consultant_verification_documents = documents.map((doc: any) => ({
          url: doc.url,
          name: doc.name,
          uploaded_at: new Date(),
        }));
      }
      user.consultant_rejection_reason = undefined;

      await user.save();

      return sendSuccess(res, { status: user.consultant_verification_status }, 'Verification request submitted successfully.', 200);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @route   POST /api/v2/consultants/:id/update-status
 * @desc    Allows an admin to approve or reject a consultant's verification
 * @access  Private (Admin)
 */
router.post(
  '/:id/update-status',
  authorize(['admin', 'super_admin']),
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const { status, rejection_reason } = req.body;

      if (!isValidObjectId(id)) {
        return sendError(res, 'Invalid user ID', 400);
      }

      if (!['verified', 'rejected'].includes(status)) {
        return sendError(res, 'Invalid status provided', 400);
      }

      if (status === 'rejected' && !rejection_reason) {
        return sendError(res, 'Rejection reason is required when rejecting a request', 400);
      }

      const user = await User.findById(id);
      if (!user || user.role !== 'consultant') {
        return sendError(res, 'Consultant not found', 404);
      }

      user.consultant_verification_status = status;
      if (status === 'rejected') {
        user.consultant_rejection_reason = rejection_reason;
      } else {
        user.consultant_rejection_reason = undefined;
      }

      await user.save();

      return sendSuccess(res, user, `Consultant has been ${status}.`, 200);
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
