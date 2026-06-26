import { Router, Request, Response, NextFunction } from 'express'
import { authenticate, AuthRequest } from '../../middleware/authMongo'
import { Certification } from '../../models/Certification'
import { Application } from '../../models/Application'
import { Payment } from '../../models/Payment'
import { User } from '../../models/User'
import { sendSuccess } from '../../utils/response'

const router = Router()
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

router.get('/overview', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const query: any = {}
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
    query.org_id = req.user!.org_id
  }

  // Count Active Certifications
  const total_certifications = await Certification.countDocuments({ ...query, deleted_at: { $exists: false } })
  const active_certifications = await Certification.countDocuments({ ...query, status: 'active', deleted_at: { $exists: false } })
  const expiring_soon = await Certification.countDocuments({ ...query, status: 'expiring_soon', deleted_at: { $exists: false } })

  // Count Pending Applications
  const pending_applications = await Application.countDocuments({ ...query, status: { $in: ['draft', 'submitted', 'under_review'] }, deleted_at: { $exists: false } })

  // Active Users (excluding clients)
  let active_users = 0;
  if (req.user!.role === 'admin' || req.user!.role === 'super_admin') {
    active_users = await User.countDocuments({ role: { $ne: 'client' }, deleted_at: { $exists: false } })
  } else {
    active_users = await User.countDocuments({ role: { $ne: 'client' }, org_id: req.user!.org_id, deleted_at: { $exists: false } })
  }

  // Total collected payments
  const payments = await Payment.find({ ...query, status: { $in: ['paid', 'captured'] } })
  const total_revenue = payments.reduce((acc, curr) => acc + (curr.total_paise / 100), 0)

  // Monthly trend for the current year
  const currentYear = new Date().getFullYear();
  const paymentsTrend = await Payment.aggregate([
    { $match: { status: { $in: ['paid', 'captured'] }, created_at: { $gte: new Date(`${currentYear}-01-01`) } } },
    { $group: { _id: { $month: "$created_at" }, total: { $sum: "$total_paise" } } }
  ]);
  const certsTrend = await Certification.aggregate([
    { $match: { created_at: { $gte: new Date(`${currentYear}-01-01`) } } },
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
    { $match: { ...query, deleted_at: { $exists: false } } },
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
    { $match: { ...query, deleted_at: { $exists: false } } },
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

export default router
