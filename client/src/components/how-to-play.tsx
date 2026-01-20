import { motion } from "framer-motion";
import React, { useMemo } from "react";
import content from "@/lib/content.json";

const { howToPlay } = content;

export default function HowToPlay() {
  const particles = useMemo(() => {
    return Array.from({ length: 15 }, () => {
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
        delay
      };
    });
  }, []);
  return (
    <section id="how-to-play" className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gold particles */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute w-1 h-1 rounded-full bg-[#c9a24d]"
            style={{ top: p.top, left: p.left, opacity: p.opacity }}
            animate={{ y: [0, -40, 0], opacity: [0.1, 0.4, 0.1] }}
            transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
          />
        ))}

        {/* Gold accent lines */}
        <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-[#c9a24d]/0 via-[#c9a24d]/20 to-[#c9a24d]/0"></div>
        <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-[#c9a24d]/0 via-[#c9a24d]/20 to-[#c9a24d]/0"></div>

        {/* Background texture */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.h2
            className="font-playfair text-4xl md:text-5xl font-bold mb-6 inline-block"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            style={{
              background: "linear-gradient(to right, #c9a24d, #a67c4a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            {howToPlay.title}
          </motion.h2>
          <motion.p
            className="text-xl text-white/80 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            {howToPlay.subtitle}
          </motion.p>
        </motion.div>

        {/* Game flow steps */}
        <div className="max-w-3xl mx-auto">
          <ul className="space-y-8">
            {howToPlay.steps.map((step) => (
              <motion.li
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: Number(step.number) * 0.05 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2d4a5e] border border-[#c9a24d]/30 group-hover:border-[#c9a24d]/60 transition-all">
                      <span className="text-lg font-bold text-[#c9a24d]">{step.number}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-[#c9a24d] transition-colors mb-2">
                      {step.title}
                    </h3>
                    <p className="text-white/80">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
