import { motion } from "framer-motion";

interface ParticleProps {
  index: number;
}

export const ParticleBackground: React.FC<ParticleProps> = ({ index }) => (
  <motion.div
    key={index}
    className="absolute w-1 h-1 rounded-full bg-[#c9a24d]"
    style={{
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      opacity: Math.random() * 0.3 + 0.1
    }}
    animate={{
      y: [0, -40, 0],
      opacity: [0.1, 0.4, 0.1]
    }}
    transition={{
      duration: Math.random() * 5 + 5,
      repeat: Infinity,
      ease: "easeInOut",
      delay: Math.random() * 5
    }}
  />
);
