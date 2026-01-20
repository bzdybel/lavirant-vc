import { SectionBackground, SectionHeader } from "@/components/shared";
import ProductCard from "./pricing-section/ProductCard";
import PaymentMethods from "./pricing-section/PaymentMethods";
import content from "@/lib/content.json";

const { pricing } = content;

export default function PricingSection() {
  if (!pricing.products || pricing.products.length === 0) {
    return null;
  }

  return (
    <section
      id="pricing"
      className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden"
    >
      <SectionBackground>
        <div className="container mx-auto px-6 relative z-10">
          <SectionHeader title={pricing.title} subtitle={pricing.subtitle} />

          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-8 max-w-lg">
              {pricing.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  badge={pricing.badge}
                  button={pricing.button}
                />
              ))}
            </div>
          </div>

          <PaymentMethods note={pricing.note} payments={pricing.payments} />
        </div>
      </SectionBackground>
    </section>
  );
}
