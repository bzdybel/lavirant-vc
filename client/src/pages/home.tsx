import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { SEOHead } from "@/components/SEOHead";
import { organizationSchema } from "@/lib/seo-schemas";

import HeroSection from "@/components/hero-section";
import HowToPlay from "@/components/how-to-play";
import ProductShowcase from "@/components/product-showcase";
import ForWhomSection from "@/components/for-whom-section";
import EmotionsSection from "@/components/emotions-section";
import PricingSection from "@/components/pricing-section";
import TestimonialsSection from "@/components/testimonials";
import FaqSection from "@/components/faq-section";

const SECTIONS = [
  { id: "hero", Component: HeroSection },
  { id: "how-to-play", Component: HowToPlay },
  { id: "contents", Component: ProductShowcase },
  { id: "for-whom", Component: ForWhomSection },
  { id: "emotions", Component: EmotionsSection },
  { id: "pricing", Component: PricingSection },
  { id: "reviews", Component: TestimonialsSection },
  { id: "faq", Component: FaqSection },
];

export default function Home() {
  return (
    <>
      <SEOHead
        title="Lavirant – Strategiczna Gra Planszowa | Gra Towarzyska dla Dorosłych"
        description="Lavirant to innowacyjna gra planszowa strategiczna łącząca blef, dedukcję i psychologię. Idealna gra towarzyska dla 5-8 graczy od 13 lat. Kup grę planszową Lavirant i odkryj kto kłamie!"
        canonical="/"
        structuredData={organizationSchema}
      />
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-background">
        <Navbar />

        <main>
          {SECTIONS.map(({ id, Component }) => (
            <section key={id} id={id}>
              <Component />
            </section>
          ))}
        </main>

        <Footer />
      </div>
    </>
  );
}
