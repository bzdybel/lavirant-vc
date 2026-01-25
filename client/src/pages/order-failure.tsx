import { Button } from "@/components/ui/button";
import { Home, RotateCcw, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { XCircle } from "lucide-react";
import content from "@/lib/content.json";

const { orderFailure } = content;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function OrderFailure() {
  const [, navigate] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0a1929] via-[#0f2433] to-[#1a3244] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-3xl mx-4 text-center"
      >
        <motion.div variants={itemVariants} className="mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-2xl"
          >
            <XCircle className="w-14 h-14 text-white" strokeWidth={2.5} />
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 mb-4">
            {orderFailure.title}
          </h1>
        </motion.div>

        <motion.div
          variants={itemVariants}
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
              <div
                key={reason.id}
                className="flex items-start text-left p-4 bg-[#0f2433]/60 rounded-xl border border-white/5"
              >
                <div className="w-2 h-2 rounded-full bg-red-400 mt-2 mr-3 flex-shrink-0" />
                <p className="text-white/80">{reason.text}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#c9a24d]/10 border border-[#c9a24d]/20 rounded-xl p-6 mb-6">
            <p className="text-white/90">
              <Mail className="inline-block w-5 h-5 mr-2 text-[#c9a24d]" />
              <span className="font-semibold text-[#c9a24d]">
                {orderFailure.support.title}
              </span>{" "}
              {orderFailure.support.description}
            </p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
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
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 font-semibold px-8 py-6 text-lg"
          >
            <Home className="mr-2 h-5 w-5" />
            {orderFailure.buttons.home}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
