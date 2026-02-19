import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocation } from "wouter";
import { useEffect, useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import CheckoutForm from "@/components/CheckoutForm";
import { useProduct, usePaymentIntent } from "@/hooks/useCheckout";
import { STRIPE_CONFIG, PAYMENT_CONFIG } from "@/config/checkout.config";
import {
  PageLayout,
  CheckoutCard,
  LoadingState,
  ErrorState,
  ProductSummary,
} from "@/components/checkout";
import { SEOHead } from "@/components/SEOHead";
import {
  createProductSchema,
  createBreadcrumbSchema,
} from "@/lib/seo-schemas";
import content from "@/lib/content.json";
import { ensurePrivateAccess } from "@/lib/ensurePrivateAccess";


const getProductId = (): string => {
  const params = new URLSearchParams(window.location.search);
  return params.get("productId") || PAYMENT_CONFIG.defaultProductId;
};

export default function Checkout() {
  ensurePrivateAccess();
  const [, navigate] = useLocation();
  const productId = getProductId();

  const { data: product, isLoading } = useProduct(productId);
  const { data: clientSecret } = usePaymentIntent(product?.price ?? null);


  const stripePromise = useMemo(() => {
    if (STRIPE_CONFIG.isMockMode) {
      return null;
    }

    if (!STRIPE_CONFIG.publicKey) {
      console.error("Stripe public key missing");
      return null;
    }

    return loadStripe(STRIPE_CONFIG.publicKey);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  if (!STRIPE_CONFIG.isMockMode && !stripePromise) {
    return <ErrorState onNavigateHome={() => navigate("/")} />;
  }

  if (isLoading || !product) {
    return <LoadingState />;
  }

  const productSchema = createProductSchema({
    name: product.name,
    description:
      product.description ||
      `${product.name} – Strategiczna gra planszowa towarzyska`,
    image: `${window.location.origin}${product.image}`,
    price: product.price / 100,
    availability: "InStock",
  });

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Strona główna", url: `${window.location.origin}/` },
    { name: "Kasa", url: `${window.location.origin}/checkout` },
  ]);

  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [productSchema, breadcrumbSchema],
  };

  return (
    <>
      <SEOHead
        title={`Kup ${product.name} | Lavirant – Gra Planszowa Strategiczna`}
        description={`Zamów ${product.name} – strategiczną grę planszową towarzyską. Bezpieczna płatność, darmowa dostawa od 200 zł.`}
        canonical="/checkout"
        ogType="product"
        structuredData={combinedSchema}
      />

      <PageLayout>
        <Button
          variant="ghost"
          className="mb-6 hover:bg-white/10 text-white"
          onClick={() => navigate("/")}
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
            <ProductSummary
              name={product.name}
              price={product.price}
              image={product.image}
            />

            {/* 🧪 MOCK MODE – bez Stripe */}
            {STRIPE_CONFIG.isMockMode && (
              <CheckoutForm
                amount={product.price}
                productId={product.id}
              />
            )}

            {/* 💳 STRIPE MODE */}
            {!STRIPE_CONFIG.isMockMode && clientSecret && stripePromise && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  locale: "pl",
                  appearance: {
                    theme: "night",
                    variables: {
                      colorPrimary: "#c9a24d",
                      colorBackground: "#1a3244",
                      colorText: "#ffffff",
                      colorDanger: "#ef4444",
                      fontFamily:
                        "system-ui, -apple-system, sans-serif",
                      spacingUnit: "4px",
                      borderRadius: "8px",
                      colorTextSecondary: "#e5e7eb",
                      colorTextPlaceholder: "#9ca3af",
                    },
                    rules: {
                      ".Tab": {
                        backgroundColor: "#0f2433",
                        border:
                          "1px solid rgba(255, 255, 255, 0.1)",
                        boxShadow: "none",
                        color: "#ffffff",
                      },
                      ".Tab--selected": {
                        backgroundColor: "#1a3244",
                        border: "1px solid #c9a24d",
                        boxShadow: "0 0 0 1px #c9a24d",
                      },
                      ".Input": {
                        backgroundColor: "#0f2433",
                        border:
                          "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#ffffff",
                      },
                      ".Input:focus": {
                        border: "1px solid #c9a24d",
                        boxShadow: "0 0 0 1px #c9a24d",
                        backgroundColor: "#132b3d",
                      },
                    },
                  },
                }}
              >
                <CheckoutForm
                  amount={product.price}
                  productId={product.id}
                />
              </Elements>
            )}

             {!STRIPE_CONFIG.isMockMode && !clientSecret && (
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary-600 border-t-transparent" />
                <span className="ml-3 text-white">
                  {content.checkout.preparing}
                </span>
              </div>
            )}
          </CardContent>
        </CheckoutCard>
      </PageLayout>
    </>
  );
}
