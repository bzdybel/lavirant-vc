import { useMemo } from "react";
import { motion } from "framer-motion";

interface ParticleGeneratorProps {
  count?: number;
}

export default function ParticleGenerator({ count = 15 }: ParticleGeneratorProps) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => {
      const top = `${Math.random() * 100}%`;
      const left = `${Math.random() * 100}%`;
      const delay = Math.random() * 5;
      const id = `${top}-${left}-${delay}`;
      return {
        id,
        top,
        left,
        opacity: Math.random() * 0.3 + 0.1,
        duration: Math.random() * 5 + 5,
        delay,
      };
    });
  }, [count]);

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-1 rounded-full bg-[#c9a24d]"
          style={{ top: p.top, left: p.left, opacity: p.opacity }}
          animate={{ y: [0, -40, 0], opacity: [0.1, 0.4, 0.1] }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </>
  );
}
