/**
 * API Router — mounts all MongoDB-backed routes.
 * 
 * Routes are organized into:
 *   - Core v2 routes (fully migrated to MongoDB with Mongoose models)
 *   - Stub routes (return realistic mock data during migration)
 */
import { Router, Response } from 'express';

// Core v2 routes (fully MongoDB-backed)
import authRoutes from './v2/auth';
import applicationsRoutes from './v2/applications';
import documentsRoutes from './v2/documents';
import notificationsRoutes from './v2/notifications';
import workflowsRoutes from './v2/workflows';
import marketAccessRoutes from '../routes/marketAccessRoutes';
import testingRoutes from './v2/testing';
import inspectionsRoutes from './v2/inspections';
import shipmentsRoutes from './v2/shipments';
import paymentsRoutes from './v2/payments';
import certificationsRoutes from './v2/certifications';
import analyticsRoutes from './v2/analytics';
import usersRoutes from './v2/users';
import meetingsRoutes from './v2/meetings';
import meetingSlotsRoutes from './v2/meetingSlots';
import supportTicketsRoutes from './v2/supportTickets';
import businessIntelligenceRoutes from './v2/businessIntelligence';
import configRoutes from './v2/config';
import standardsRoutes from './v2/standards';
import consultantsRoutes from './v2/consultants';
import productsRoutes from './v2/products';
import leadsRoutes from './v2/leads';

// Stubs removed

import { authenticate, AuthRequest } from '../middleware/authMongo';
import { User } from '../models';

import { aiLimiter, uploadLimiter } from '../middleware/rateLimiters';
import realAiRouter from './ai';
import realInsightsRouter from './insights';

const router = Router();

// ── Core v2 routes (full Mongoose models) ─────────────────────────────────
router.use('/auth', authRoutes);
router.use('/applications', applicationsRoutes);
router.use('/products', productsRoutes);
router.use('/leads', leadsRoutes);
router.use('/documents', uploadLimiter, documentsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/workflows', workflowsRoutes);
router.use('/market-access', marketAccessRoutes);
router.use('/testing', testingRoutes);
router.use('/inspections', inspectionsRoutes);
router.use('/shipments', shipmentsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/certifications', certificationsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/users', usersRoutes);
router.use('/meetings', meetingsRoutes);
router.use('/meeting-slots', meetingSlotsRoutes);
router.use('/support-tickets', supportTicketsRoutes);
router.use('/bi', businessIntelligenceRoutes);
router.use('/remote-config', configRoutes);
router.use('/standards', standardsRoutes);
router.use('/consultants', consultantsRoutes);

// ── Migrated to Mongoose ──────────────────────────────────────────────────
router.use('/ai', aiLimiter, realAiRouter);
router.use('/insights', realInsightsRouter);

export default router;
