import { Router, Request, Response, NextFunction } from 'express'
import { authenticate, AuthRequest } from '../../middleware/authMongo'
import { Certification } from '../../models/Certification'
import { Application } from '../../models/Application'
import { Payment } from '../../models/Payment'
import { User } from '../../models/User'
import { AuditLog } from '../../models/AuditLog'
import { Document } from '../../models/Document'
import { sendSuccess } from '../../utils/response'

const router = Router()
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

router.get('/overview', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  // Per-model ownership scope. A client is frequently org-less, so scoping them by
  // `{ org_id: undefined }` matched every org-less record platform-wide — that is
  // why the "Business Impact / Revenue Processed" tile showed a stray ₹1 to every
  // customer. Scope each model by its real owner instead.
  const role = req.user!.role
  const isStaff = role === 'admin' || role === 'super_admin'
  const isClient = role === 'client'

  let certScope: any = {}
  let appScope: any = {}
  let payScope: any = {}
  if (isClient) {
    const appIds = await Application.find({ created_by: req.user!._id }).distinct('_id')
    appScope = { created_by: req.user!._id }
    certScope = { application_id: { $in: appIds } }
    payScope = { user_id: req.user!._id }
  } else if (!isStaff) {
    // employee/consultant — legitimately organisation-scoped
    appScope = { org_id: req.user!.org_id }
    certScope = { org_id: req.user!.org_id }
    payScope = { org_id: req.user!.org_id }
  }
  // admin / super_admin: platform-wide (all scopes empty)

  // Count Active Certifications
  const total_certifications = await Certification.countDocuments({ ...certScope, deleted_at: { $exists: false } })
  const active_certifications = await Certification.countDocuments({ ...certScope, status: 'active', deleted_at: { $exists: false } })
  const expiring_soon = await Certification.countDocuments({ ...certScope, status: 'expiring_soon', deleted_at: { $exists: false } })

  // Count Pending Applications
  const pending_applications = await Application.countDocuments({ ...appScope, status: { $in: ['draft', 'submitted', 'docs_review', 'docs_required', 'tech_review', 'testing', 'approval_pending', 'on_hold'] }, deleted_at: { $exists: false } })

  // Active Users (excluding clients)
  let active_users = 0;
  if (isStaff) {
    active_users = await User.countDocuments({ role: { $ne: 'client' }, deleted_at: { $exists: false } })
  } else if (req.user!.org_id) {
    active_users = await User.countDocuments({ role: { $ne: 'client' }, org_id: req.user!.org_id, deleted_at: { $exists: false } })
  }

  // Total collected payments (customer's own payments only)
  const payments = await Payment.find({ ...payScope, status: { $in: ['paid', 'captured'] } })
  const total_revenue = payments.reduce((acc, curr) => acc + (curr.total_paise / 100), 0)

  // Monthly trend for the current year — scoped to the same owner.
  const currentYear = new Date().getFullYear();
  const paymentsTrend = await Payment.aggregate([
    { $match: { ...payScope, status: { $in: ['paid', 'captured'] }, created_at: { $gte: new Date(`${currentYear}-01-01`) } } },
    { $group: { _id: { $month: "$created_at" }, total: { $sum: "$total_paise" } } }
  ]);
  const certsTrend = await Certification.aggregate([
    { $match: { ...certScope, created_at: { $gte: new Date(`${currentYear}-01-01`) } } },
    { $group: { _id: { $month: "$created_at" }, count: { $sum: 1 } } }
  ]);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthly_trend = months.map((month, i) => {
    const monthIndex = i + 1;
    const p = paymentsTrend.find(x => x._id === monthIndex);
    const c = certsTrend.find(x => x._id === monthIndex);
    return {
      month,
      revenue: p ? p.total / 100 : 0,
      certificates: c ? c.count : 0
    };
  });

  const country_aggr = await Certification.aggregate([
    { $match: { ...certScope, deleted_at: { $exists: false } } },
    { $group: { _id: "$market", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  const fillColors = ['#6C63FF', '#00D4FF', '#00C896', '#FFB347', '#8B92A5'];
  const country_data = country_aggr.map((x, i) => ({
    country: x._id || 'Unknown',
    certs: x.count,
    fill: fillColors[i % fillColors.length]
  }));

  const type_aggr = await Certification.aggregate([
    { $match: { ...certScope, deleted_at: { $exists: false } } },
    { $group: { _id: "$type", count: { $sum: 1 } } }
  ]);
  const certification_mix = type_aggr.map((x, i) => ({
    name: x._id || 'Other',
    value: x.count,
    color: fillColors[i % fillColors.length]
  }));

  sendSuccess(res, {
    total_certifications,
    active_certifications,
    expiring_soon,
    pending_applications,
    active_users,
    total_revenue,
    monthly_trend,
    country_data,
    certification_mix
  })
}))

router.get('/dashboard', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const query: any = {}
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
    query.org_id = req.user!.org_id
  }

  const [total_applications, active_certifications, pending_payments_agg, expiring_certs, recent_audit] = await Promise.all([
    Application.countDocuments({ ...query, deleted_at: { $exists: false } }),
    Certification.countDocuments({ ...query, status: 'active', deleted_at: { $exists: false } }),
    Payment.countDocuments({ ...query, status: 'pending' }),
    Certification.find({ ...query, status: 'expiring_soon', deleted_at: { $exists: false } })
      .populate('product_id', 'name')
      .sort({ expiry_date: 1 }).limit(5).lean(),
    AuditLog.find(query.org_id ? { 'meta.org_id': query.org_id } : {})
      .sort({ ts: -1 }).limit(10).lean(),
  ])

  const currentYear = new Date().getFullYear()
  const monthly_apps = await Application.aggregate([
    { $match: { ...query, created_at: { $gte: new Date(`${currentYear}-01-01`) }, deleted_at: { $exists: false } } },
    { $group: { _id: { $month: "$created_at" }, count: { $sum: 1 } } }
  ])
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthly_applications = months.map((month, i) => {
    const m = monthly_apps.find(x => x._id === i + 1)
    return { month, count: m ? m.count : 0 }
  })

  const docCount = await Document.countDocuments(query.org_id ? { org_id: query.org_id } : {})
  const compliance_score = active_certifications > 0
    ? Math.min(100, Math.round((active_certifications / Math.max(1, total_applications)) * 100))
    : 0

  sendSuccess(res, {
    total_applications,
    active_certifications,
    pending_payments: pending_payments_agg,
    compliance_score,
    monthly_applications,
    recent_activity: recent_audit.map(a => ({
      id: a._id,
      type: a.meta.action,
      title: `${a.meta.resource_type} ${a.meta.action}`,
      description: `${a.meta.resource_type} was ${a.meta.action}`,
      created_at: a.ts,
    })),
    expiring_soon: expiring_certs.map(c => ({
      id: c._id,
      cert_type: c.cert_type,
      product_name: (c.product_id as any)?.name || 'Unknown',
      expiry_date: c.expiry_date,
      days_left: Math.max(0, Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / 86400000)),
    })),
  })
}))

router.get('/compliance-score', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const query: any = {}
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
    query.org_id = req.user!.org_id
  }

  const [totalCerts, activeCerts, totalDocs] = await Promise.all([
    Certification.countDocuments({ ...query, deleted_at: { $exists: false } }),
    Certification.countDocuments({ ...query, status: 'active', deleted_at: { $exists: false } }),
    Document.countDocuments(query.org_id ? { org_id: query.org_id } : {}),
  ])

  const certRatio = totalCerts > 0 ? (activeCerts / totalCerts) * 100 : 0
  const docScore = Math.min(100, totalDocs * 10)
  const overall = Math.round((certRatio * 0.7 + docScore * 0.3))

  sendSuccess(res, {
    overall_score: overall,
    bis_score: certRatio,
    epr_score: certRatio,
    fssai_score: certRatio,
    wpc_score: certRatio,
    customs_score: certRatio,
    document_score: docScore,
    improvements: overall < 80 ? ['Complete pending certification applications', 'Upload required documents'] : [],
    trend: 0,
  })
}))

router.get('/activity', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100)
  const auditQuery: any = {}
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
    auditQuery['meta.org_id'] = req.user!.org_id
  }

  const logs = await AuditLog.find(auditQuery).sort({ ts: -1 }).limit(limit).lean()

  sendSuccess(res, logs.map(a => ({
    id: a._id,
    type: a.meta.action,
    title: `${a.meta.resource_type} ${a.meta.action}`,
    description: `${a.meta.resource_type} was ${a.meta.action}`,
    created_at: a.ts,
  })))
}))

router.get('/action-required', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const query: any = {}
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
    query.org_id = req.user!.org_id
  }

  const [pendingApps, expiringCerts, pendingPayments] = await Promise.all([
    Application.countDocuments({ ...query, status: { $in: ['submitted', 'under_review'] }, deleted_at: { $exists: false } }),
    Certification.countDocuments({ ...query, status: 'expiring_soon', deleted_at: { $exists: false } }),
    Payment.countDocuments({ ...query, status: 'pending' }),
  ])

  sendSuccess(res, {
    total: pendingApps + expiringCerts + pendingPayments,
    categories: {
      pending_applications: pendingApps,
      expiring_certifications: expiringCerts,
      pending_payments: pendingPayments,
    },
  })
}))

router.get('/action-required/items', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const category = req.query.category as string
  const query: any = {}
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
    query.org_id = req.user!.org_id
  }

  let items: any[] = []
  switch (category) {
    case 'pending_applications':
      items = await Application.find({ ...query, status: { $in: ['submitted', 'under_review'] }, deleted_at: { $exists: false } })
        .populate('product_id', 'name').sort({ created_at: -1 }).limit(20).lean()
      break
    case 'expiring_certifications':
      items = await Certification.find({ ...query, status: 'expiring_soon', deleted_at: { $exists: false } })
        .populate('product_id', 'name').sort({ expiry_date: 1 }).limit(20).lean()
      break
    case 'pending_payments':
      items = await Payment.find({ ...query, status: 'pending' })
        .populate('user_id', 'name email').sort({ created_at: -1 }).limit(20).lean()
      break
  }

  sendSuccess(res, items)
}))

export default router
