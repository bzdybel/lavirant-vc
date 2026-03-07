import { motion } from "framer-motion";
import { ANIMATION_VARIANTS } from "./animations";

interface SuccessHeaderProps {
  title: string;
}

export function SuccessHeader({ title }: SuccessHeaderProps) {
  return (
    <motion.div variants={ANIMATION_VARIANTS.item} className="mb-8">
      <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#c9a24d] to-[#e6c46e] mb-4">
        {title}
      </h1>
    </motion.div>
  );
}
