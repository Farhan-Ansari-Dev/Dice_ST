import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';

export const useCurrency = () => {
  const user = useAuthStore((s) => s.user);

  return useMemo(() => {
    // 1. Check phone number for India
    if (user?.phone && user.phone.startsWith('+91')) return '₹';
    
    // 2. Check GST Number (Indian specific tax number)
    if (user?.gstNumber) return '₹';

    // 3. Check Address / State if explicitly "India" or specific states
    if (user?.city && ['delhi', 'mumbai', 'bangalore', 'chennai', 'hyderabad'].includes(user.city.toLowerCase())) return '₹';

    // 4. Fallback to Timezone
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timeZone === 'Asia/Calcutta' || timeZone === 'Asia/Kolkata') {
        return '₹';
      }
    } catch (e) {
      // Ignore Intl errors
    }

    // Default to USD
    return '$';
  }, [user]);
};

export const formatCurrency = (amount: number | string, symbol: string) => {
  return `${symbol}${amount}`;
};
