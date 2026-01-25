import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import CheckoutForm from "@/components/CheckoutForm";
import { useProduct, usePaymentIntent } from "@/hooks/useCheckout";
import { STRIPE_CONFIG, PAYMENT_CONFIG } from "@/config/checkout.config";
import { PageLayout, CheckoutCard, LoadingState, ErrorState, ProductSummary } from "@/components/checkout";
import content from "@/lib/content.json";

const stripePromise = STRIPE_CONFIG.isMockMode
  ? Promise.resolve(null)
  : loadStripe(STRIPE_CONFIG.publicKey);

const getProductId = (): string => {
  const params = new URLSearchParams(window.location.search);
  return params.get('productId') || PAYMENT_CONFIG.defaultProductId;
};

export default function Checkout() {
  const [, navigate] = useLocation();
  const productId = getProductId();
  const { data: product, isLoading } = useProduct(productId);
  const { data: clientSecret } = usePaymentIntent(product?.price ?? null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!stripePromise && !STRIPE_CONFIG.isMockMode) {
    return <ErrorState onNavigateHome={() => navigate('/')} />;
  }

  if (isLoading || !product) {
    return <LoadingState />;
  }

  return (
    <PageLayout>
      <Button
        variant="ghost"
        className="mb-6 hover:bg-white/10 text-white"
        onClick={() => navigate('/')}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        {content.checkout.backButton}
      </Button>

      <CheckoutCard>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">
            {content.checkout.title}
          </CardTitle>
          <CardDescription className="text-neutral-300">
            {content.checkout.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductSummary name={product.name} price={product.price} image={product.image} />

          {STRIPE_CONFIG.isMockMode ? (
            <Elements stripe={stripePromise}>
              <CheckoutForm amount={product.price} productId={product.id} />
            </Elements>
          ) : clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                locale: 'pl',
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#c9a24d',
                    colorBackground: '#1a3244',
                    colorText: '#ffffff',
                    colorDanger: '#ef4444',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '8px',
                    colorTextSecondary: '#e5e7eb',
                    colorTextPlaceholder: '#9ca3af',
                  },
                  rules: {
                    '.Tab': {
                      backgroundColor: '#0f2433',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'none',
                      color: '#ffffff',
                    },
                    '.Tab:hover': {
                      backgroundColor: '#132b3d',
                      border: '1px solid rgba(201, 162, 77, 0.3)',
                      color: '#ffffff',
                    },
                    '.Tab--selected': {
                      backgroundColor: '#1a3244',
                      border: '1px solid #c9a24d',
                      boxShadow: '0 0 0 1px #c9a24d',
                      color: '#ffffff',
                    },
                    '.Tab--selected:hover': {
                      backgroundColor: '#1a3244',
                      color: '#ffffff',
                    },
                    '.TabLabel': {
                      color: '#ffffff',
                    },
                    '.TabLabel--selected': {
                      color: '#ffffff',
                    },
                    '.TabIcon': {
                      fill: '#ffffff',
                    },
                    '.TabIcon--selected': {
                      fill: '#ffffff',
                    },
                    '.Input': {
                      backgroundColor: '#0f2433',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                    },
                    '.Input:focus': {
                      border: '1px solid #c9a24d',
                      boxShadow: '0 0 0 1px #c9a24d',
                      backgroundColor: '#132b3d',
                    },
                    '.Label': {
                      color: '#ffffff',
                      fontWeight: '500',
                    },
                    '.Block': {
                      backgroundColor: '#0f2433',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '.Text': {
                      color: '#ffffff',
                    },
                    '.Text--redirect': {
                      color: '#e5e7eb',
                    },
                  },
                },
              }}
            >
              <CheckoutForm amount={product.price} productId={product.id} />
            </Elements>
          ) : (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary-600 border-t-transparent"></div>
              <span className="ml-3 text-white">{content.checkout.preparing}</span>
            </div>
          )}
        </CardContent>
      </CheckoutCard>
    </PageLayout>
  );
}
