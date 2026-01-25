import { Button } from "@/components/ui/button";
import { Home, Mail, Package, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import content from "@/lib/content.json";

const { orderSuccess } = content;

export default function OrderSuccess() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0a1929] via-[#0f2433] to-[#1a3244] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#c9a24d]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-3xl mx-4 text-center"
      >
        <motion.div
          variants={itemVariants}
          className="mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.1,
            }}
            className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-2xl"
          >
            <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#c9a24d] to-[#e6c46e] mb-4">
            {orderSuccess.title}
          </h1>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-[#132b3d]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl mb-8"
        >
          <p className="text-xl md:text-2xl text-white mb-6">
            {orderSuccess.subtitle}
          </p>

          <p className="text-lg text-white/70 mb-8">
            {orderSuccess.description}
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {orderSuccess.steps.map((step, index) => (
              <motion.div
                key={step.id}
                variants={itemVariants}
                className="flex flex-col items-center text-center p-6 bg-[#0f2433]/60 rounded-xl border border-white/5"
              >
                <div className="w-12 h-12 rounded-full bg-[#c9a24d]/20 flex items-center justify-center mb-4">
                  {step.icon === 'Mail' && <Mail className="w-6 h-6 text-[#c9a24d]" />}
                  {step.icon === 'Package' && <Package className="w-6 h-6 text-[#c9a24d]" />}
                  {step.icon === 'CheckCircle2' && <CheckCircle2 className="w-6 h-6 text-[#c9a24d]" />}
                </div>
                <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                <p className="text-white/60 text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="bg-[#c9a24d]/10 border border-[#c9a24d]/20 rounded-xl p-6 mb-6">
            <p className="text-white/90">
              <span className="font-semibold text-[#c9a24d]">
                {orderSuccess.support.title}
              </span>{" "}
              {orderSuccess.support.description}
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => setLocation("/")}
            size="lg"
            className="bg-[#c9a24d] hover:bg-[#b39143] text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <Home className="mr-2 h-5 w-5" />
            {orderSuccess.buttons.home}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
