import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { User } from '../../models/User';
import { sendSuccess, sendError } from '../../utils/response';
import { isValidObjectId } from 'mongoose';
import { authenticate, AuthRequest } from '../../middleware/authMongo';

const router = Router();
// authorize() only checks req.user.role — authenticate must run first to
// populate req.user, otherwise every request is rejected as unauthenticated.
router.use(authenticate);

/**
 * @route   POST /api/v2/consultants/request-verification
 * @desc    Allows a consultant to submit a verification request
 * @access  Private (Consultant)
 */
router.post(
  '/request-verification',
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

      // A "consultant" is identified by the self-declared onboarding type
      // (business_role) OR an admin-assigned role. `role` alone was wrong here:
      // onboarding stores the consultant intent in `business_role` and leaves
      // `role` at its default 'client', so authorize(['consultant']) rejected
      // every genuine consultant with 403 forbidden. Submitting is a NON-
      // privileged action (it only sets status='pending'); approval stays
      // admin-only (see /:id/update-status), so a self-declared consultant can
      // never approve themselves here.
      const isConsultant = user.business_role === 'consultant' || user.role === 'consultant';
      if (!isConsultant) {
        return sendError(res, 'Only consultant accounts can submit verification.', 403);
      }

      // Idempotency / no duplicate active requests. Rejected or never-submitted
      // users may (re)submit; pending/verified users may not.
      if (user.consultant_verification_status === 'pending') {
        return sendError(res, 'Your verification is already under review.', 409);
      }
      if (user.consultant_verification_status === 'verified') {
        return sendError(res, 'Your account is already verified.', 409);
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
      // Match the same "consultant" definition used on submit: self-declared
      // business_role OR admin-assigned role OR anyone who has already submitted
      // a verification request. Checking role alone previously made every real
      // consultant un-approvable (404) because their role is 'client'.
      const isConsultant =
        !!user &&
        (user.business_role === 'consultant' ||
          user.role === 'consultant' ||
          !!user.consultant_verification_status);
      if (!isConsultant) {
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
