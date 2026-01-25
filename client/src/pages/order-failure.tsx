import { Button } from "@/components/ui/button";
import { Home, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import {
  FailureBackgroundGradient,
  FailureHeader,
  FailureReason,
  FailureSupportBanner,
  FAILURE_ANIMATION_VARIANTS,
} from "@/components/order-failure";
import content from "@/lib/content.json";

const { orderFailure } = content;

export default function OrderFailure() {
  const [, navigate] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0a1929] via-[#0f2433] to-[#1a3244] relative overflow-hidden">
      <FailureBackgroundGradient />

      <motion.div
        variants={FAILURE_ANIMATION_VARIANTS.container}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-3xl mx-4 text-center"
      >
        <FailureHeader title={orderFailure.title} />

        <motion.div
          variants={FAILURE_ANIMATION_VARIANTS.item}
          className="bg-[#132b3d]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl mb-8"
        >
          <p className="text-xl md:text-2xl text-white mb-6">
            {orderFailure.subtitle}
          </p>

          <p className="text-lg text-white/70 mb-8">
            {orderFailure.description}
          </p>

          <div className="space-y-4 mb-8">
            {orderFailure.reasons.map((reason) => (
              <FailureReason key={reason.id} text={reason.text} />
            ))}
          </div>

          <FailureSupportBanner
            title={orderFailure.support.title}
            description={orderFailure.support.description}
          />
        </motion.div>

        <motion.div variants={FAILURE_ANIMATION_VARIANTS.item} className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate("/checkout?productId=1")}
            size="lg"
            className="bg-[#c9a24d] hover:bg-[#b39143] text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            {orderFailure.buttons.retry}
          </Button>
          <Button
            onClick={() => navigate("/")}
            size="lg"
            className="bg-white/10 border border-white/30 text-white hover:bg-white/20 hover:border-white/50 font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <Home className="mr-2 h-5 w-5" />
            {orderFailure.buttons.home}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
