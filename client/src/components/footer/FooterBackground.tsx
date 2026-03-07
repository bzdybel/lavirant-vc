import { motion } from "framer-motion";

const PARTICLE_COUNT = 8;
const MIN_PARTICLE_OPACITY = 0.1;
const MAX_PARTICLE_OPACITY = 0.3;

export const FooterBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#c9a24d]/0 via-[#c9a24d]/40 to-[#c9a24d]/0" />
    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]" />
    {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-[#c9a24d]"
        style={{
          top: `${80 + Math.random() * 15}%`,
          left: `${Math.random() * 100}%`,
          opacity: Math.random() * (MAX_PARTICLE_OPACITY - MIN_PARTICLE_OPACITY) + MIN_PARTICLE_OPACITY
        }}
        animate={{
          y: [0, -20, 0],
          opacity: [MIN_PARTICLE_OPACITY, MAX_PARTICLE_OPACITY, MIN_PARTICLE_OPACITY]
        }}
        transition={{
          duration: Math.random() * 5 + 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: Math.random() * 5
        }}
      />
    ))}
  </div>
);
