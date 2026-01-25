import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { ANIMATION_VARIANTS } from "./animations";

interface SuccessHeaderProps {
  title: string;
}

export function SuccessHeader({ title }: SuccessHeaderProps) {
  return (
    <motion.div variants={ANIMATION_VARIANTS.item} className="mb-8">
      <motion.div
        initial={ANIMATION_VARIANTS.successIcon.initial}
        animate={ANIMATION_VARIANTS.successIcon.animate}
        transition={ANIMATION_VARIANTS.successIcon.transition}
        className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-2xl"
      >
        <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
      </motion.div>

      <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#c9a24d] to-[#e6c46e] mb-4">
        {title}
      </h1>
    </motion.div>
  );
}
