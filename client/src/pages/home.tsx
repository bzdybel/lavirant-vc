import Navbar from "@/components/navbar";
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
import CtaSection from "@/components/cta-section";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-background">
      <Navbar />
      <section id="hero">
        <HeroSection />
      </section>
      <section id="jak-wyglada-rozgrywka">
        <HowToPlay />
      </section>
      <section id="zawartość">
        <ProductShowcase />
      </section>
      <section id="dla-kogo">
        <ForWhomSection />
      </section>
      <section id="emocje">
        <EmotionsSection />
      </section>
      <section id="ceny">
        <PricingSection />
      </section>
      <section id="opinie">
        <TestimonialsSection />
      </section>
      <section id="faq">
        <FaqSection />
      </section>
      <Footer />
    </div>
  );
}
