import { Application } from '../models/Application';
import { User } from '../models/User';

/**
 * Calculates the quotation breakdown and total amount for a payment.
 * Adds a fixed consultancy fee of $50 **only** when the requesting user has the
 * role 'employee'. For Indian users the consultancy fee is ₹1999 and GST of 18%
 * is applied.
 */
export async function calculateQuotation(user: User, data: {
  application_id: string;
  gov_fee: number | string;
  lab_fee: number | string;
}) {
  const { application_id, gov_fee, lab_fee } = data;

  const app: any = await Application.findById(application_id).populate('client_id');
  if (!app) {
    throw new Error('Application not found');
  }

  const clientUser = await User.findById(app.client_id);
  const isIndian = clientUser?.country_code === 'IN';

  const currency = isIndian ? 'INR' : 'USD';
  // Base consultancy fee based on geography
  const consultancyFee = isIndian ? 1999 : 50;
  // Add consultancy fee only for employee role
  const feeToAdd = user.role === 'employee' ? consultancyFee : 0;

  const govFeeNum = Number(gov_fee) || 0;
  const labFeeNum = Number(lab_fee) || 0;

  const subtotal = govFeeNum + labFeeNum + feeToAdd;
  const taxRate = isIndian ? 18 : 0; // GST for India, no tax otherwise
  const taxAmount = subtotal * (taxRate / 100);

  const totalAmount = subtotal + taxAmount;
  const totalPaise = Math.round(totalAmount * 100);

  const breakdown = {
    gov_fee_paise: Math.round(govFeeNum * 100),
    lab_fee_paise: Math.round(labFeeNum * 100),
    consultancy_fee_paise: Math.round(feeToAdd * 100),
    subtotal_paise: Math.round(subtotal * 100),
    tax_amount_paise: Math.round(taxAmount * 100),
    tax_rate: taxRate,
  };

  return { totalPaise, breakdown, currency };
}
