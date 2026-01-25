import { motion } from "framer-motion";
import { Mail, Package, CheckCircle2, type LucideIcon } from "lucide-react";

interface OrderStepProps {
  icon: string;
  title: string;
  description: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Mail,
  Package,
  CheckCircle2,
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function OrderStep({ icon, title, description }: OrderStepProps) {
  const IconComponent = ICON_MAP[icon];
  
  if (!IconComponent) return null;

  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col items-center text-center p-6 bg-[#0f2433]/60 rounded-xl border border-white/5"
    >
      <div className="w-12 h-12 rounded-full bg-[#c9a24d]/20 flex items-center justify-center mb-4">
        <IconComponent className="w-6 h-6 text-[#c9a24d]" />
      </div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-white/60 text-sm">{description}</p>
    </motion.div>
  );
}
