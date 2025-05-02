import Navbar from "@/components/navbar";
import HeroSection from "@/components/hero-section";
import HowToPlay from "@/components/how-to-play";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-background">
      <Navbar />
      <HeroSection />
      <HowToPlay />
      <Footer />
    </div>
  );
}
