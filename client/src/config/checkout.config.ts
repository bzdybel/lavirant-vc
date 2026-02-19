export const STRIPE_CONFIG = {
  isMockMode: import.meta.env.VITE_USE_MOCK_STRIPE === "true",
  publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? ""
};
export const PAYMENT_CONFIG = {
  redirectDelay: 2000,
  defaultProductId: '1'
};

export const API_ENDPOINTS = {
  products: (id: string) => `/api/products/${id}`,
  createPaymentIntent: '/api/create-payment-intent',
  orders: '/api/orders'
};

export const THEME_CLASSES = {
  background: 'bg-gradient-to-b from-[#0f2433] via-[#132b3d] to-[#0f2433]',
  card: 'border-white/10 shadow-xl bg-[#132b3d]/90 backdrop-blur-sm',
  button: 'bg-secondary-700 hover:bg-secondary-600'
};
