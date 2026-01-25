import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import {
  BackgroundGradient,
  SuccessHeader,
  OrderStep,
  SupportBanner,
  ANIMATION_VARIANTS,
} from "@/components/order-success";
import content from "@/lib/content.json";

const { orderSuccess } = content;

export default function OrderSuccess() {
  const [, navigate] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Update meta tags to prevent indexing of success page
    const metaRobots = document.querySelector('meta[name="robots"]');
    if (metaRobots) {
      metaRobots.setAttribute('content', 'noindex, nofollow');
    }
  }, []);

  return (
    <>
      <SEOHead
        title="Zamówienie Złożone | Lavirant"
        description="Dziękujemy za zakup gry planszowej Lavirant. Potwierdzenie zamówienia zostało wysłane na Twój adres email."
        canonical="/order-success"
      />
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0a1929] via-[#0f2433] to-[#1a3244] relative overflow-hidden">
      <BackgroundGradient />

      <motion.div
        variants={ANIMATION_VARIANTS.container}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-3xl mx-4 text-center"
      >
        <SuccessHeader title={orderSuccess.title} />

        <motion.div
          variants={ANIMATION_VARIANTS.item}
          className="bg-[#132b3d]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl mb-8"
        >
          <p className="text-xl md:text-2xl text-white mb-6">
            {orderSuccess.subtitle}
          </p>

          <p className="text-lg text-white/70 mb-8">
            {orderSuccess.description}
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {orderSuccess.steps.map((step) => (
              <OrderStep
                key={step.id}
                icon={step.icon}
                title={step.title}
                description={step.description}
              />
            ))}
          </div>

          <SupportBanner
            title={orderSuccess.support.title}
            description={orderSuccess.support.description}
          />
        </motion.div>

        <motion.div variants={ANIMATION_VARIANTS.item}>
          <Button
            onClick={() => navigate("/")}
            size="lg"
            className="bg-[#c9a24d] hover:bg-[#b39143] text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <Home className="mr-2 h-5 w-5" />
            {orderSuccess.buttons.home}
          </Button>
        </motion.div>
      </motion.div>
    </div>
    </>
  );
}
