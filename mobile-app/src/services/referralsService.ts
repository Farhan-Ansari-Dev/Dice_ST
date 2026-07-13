import api from './api';

export interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  successful_referrals: number;
  total_earned: number;
  history: ReferralItem[];
}

export interface ReferralItem {
  id: string;
  referred_email: string;
  status: 'pending' | 'signed_up' | 'paid';
  reward_amount: number;
  created_at: string;
}

const referralsService = {
  getMyCode: () =>
    api.get<{ data: { referral_code: string } }>('/referrals/my-code'),

  getStats: () =>
    api.get<{ data: ReferralStats }>('/referrals/stats'),

  applyCode: (code: string) =>
    api.post<{ message: string }>('/referrals/apply', { code }),
};

export default referralsService;
