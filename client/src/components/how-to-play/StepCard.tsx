import { motion } from "framer-motion";

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  index: number;
}

export default function StepCard({
  number,
  title,
  description,
 }: StepCardProps) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ delay: Number(number) * 0.05 }}
      viewport={{ once: true }}
      className="group"
    >
      <div className="flex gap-6 items-start">
        <div className="flex-shrink-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2d4a5e] border border-[#c9a24d]/30 group-hover:border-[#c9a24d]/60 transition-all">
            <span className="text-lg font-bold text-[#c9a24d]">{number}</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white group-hover:text-[#c9a24d] transition-colors mb-2">
            {title}
          </h3>
          <p className="text-white/80">{description}</p>
        </div>
      </div>
    </motion.li>
  );
}
