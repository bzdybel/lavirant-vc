import { SectionBackground, SectionHeader } from "@/components/shared";
import PaymentMethods from "./pricing-section/PaymentMethods";
import ProductShowcase from "./pricing-section/ProductShowcase";
import content from "@/lib/content.json";

const { pricing } = content;

export default function PricingSection() {
  if (!pricing.products || pricing.products.length === 0) {
    return null;
  }

  const product = pricing.products[0];

  return (
    <section
      id="pricing"
      className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden"
    >
      <SectionBackground>
        <div className="container mx-auto px-6 relative z-10">
          <SectionHeader title={pricing.title} subtitle={pricing.subtitle} />

          {/* Product Showcase */}
          <ProductShowcase
            product={product}
            contentTitle={pricing.contentTitle}
            button={pricing.button}
            priceContext={pricing.priceContext}
            priceSubtext={pricing.priceSubtext}
            valueStatement={pricing.valueStatement}
          />

          {/* Payment Methods & Trust Section */}
          <PaymentMethods note={pricing.note} payments={pricing.payments} />
        </div>
      </SectionBackground>
    </section>
  );
}
