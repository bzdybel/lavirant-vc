import { motion } from "framer-motion";

interface FailureHeaderProps {
  title: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FailureHeader({ title }: FailureHeaderProps) {
  return (
    <motion.div variants={itemVariants} className="mb-8">
      <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 mb-4">
        {title}
      </h1>
    </motion.div>
  );
}
