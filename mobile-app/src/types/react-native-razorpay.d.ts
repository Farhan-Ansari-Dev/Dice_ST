declare module 'react-native-razorpay' {
  interface RazorpayOptions {
    description?: string;
    image?: string;
    currency: string;
    key: string;
    amount: string;
    order_id: string;
    name: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
    };
  }

  interface RazorpaySuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  interface RazorpayCheckoutStatic {
    open(options: RazorpayOptions): Promise<RazorpaySuccess>;
  }

  const RazorpayCheckout: RazorpayCheckoutStatic;
  export default RazorpayCheckout;
}
