import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

import HeroSection from "@/components/hero-section";
import HowToPlay from "@/components/how-to-play";
import FeaturesSection from "@/components/features-section";
import GuessLavrantSection from "@/components/guess-lavirant-section";
import EveryoneCanWinSection from "@/components/everyone-can-win-section";
import ProductShowcase from "@/components/product-showcase";
import ForWhomSection from "@/components/for-whom-section";
import EmotionsSection from "@/components/emotions-section";
import PricingSection from "@/components/pricing-section";
import TestimonialsSection from "@/components/testimonials";
import FaqSection from "@/components/faq-section";

const SECTIONS = [
  { id: "hero", Component: HeroSection },
  { id: "how-to-play", Component: HowToPlay },
  { id: "about-game", Component: FeaturesSection },
  { id: "true-deduction", Component: GuessLavrantSection },
  { id: "everyone-can-win", Component: EveryoneCanWinSection },
  { id: "contents", Component: ProductShowcase },
  { id: "for-whom", Component: ForWhomSection },
  { id: "emotions", Component: EmotionsSection },
  { id: "pricing", Component: PricingSection },
  { id: "reviews", Component: TestimonialsSection },
  { id: "faq", Component: FaqSection },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-background">
      <Navbar />

      {SECTIONS.map(({ id, Component }) => (
        <section key={id} id={id}>
          <Component />
        </section>
      ))}

      <Footer />
    </div>
  );
}
