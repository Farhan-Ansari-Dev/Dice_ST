/**
 * v2 router — mounts all MongoDB-backed routes.
 * Mount at: app.use('/api/v1', v2Routes)   ← keeps the same /api/v1 prefix
 *           so mobile/admin clients don't need URL changes.
 */
import { Router, Response } from 'express';
import authRoutes from './auth';
import applicationsRoutes from './applications';
import documentsRoutes from './documents';
import notificationsRoutes from './notifications';
import workflowsRoutes from './workflows';
import configRoutes from './config';
import analyticsRoutes from './analytics';
import shipmentsRoutes from './shipments';
import testingRoutes from './testing';
import certificationsRoutes from './certifications';
import paymentsRoutes from './payments';
import usersRoutes from './users';
import { authenticate, AuthRequest } from '../../middleware/authMongo';
import { User } from '../../models';

const router = Router();

// Mount sub-routers
router.use('/auth', authRoutes);
router.use('/applications', applicationsRoutes);
router.use('/documents', documentsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/workflows', workflowsRoutes);
router.use('/remote-config', configRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/shipments', shipmentsRoutes);
router.use('/testing', testingRoutes);
router.use('/certifications', certificationsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/users', usersRoutes);

export default router;
