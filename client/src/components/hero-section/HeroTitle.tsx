import { motion } from "framer-motion";
import React from "react";

interface HeroTitleProps {
  mainTitle: string;
  tagline: string;
  description: string;
}

export default function HeroTitle({
  mainTitle,
  tagline,
  description,
}: HeroTitleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center max-w-4xl mx-auto mb-12"
    >
      <h1 className="font-playfair text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
        <motion.span
          className="block text-6xl md:text-7xl lg:text-8xl"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          style={{
            background: "linear-gradient(135deg, #c9a24d, #a67c4a)",
            backgroundSize: "200% 200%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {mainTitle}
        </motion.span>
      </h1>

      <motion.p
        className="text-xl md:text-2xl mb-10 text-white/80 leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        {tagline}
        <br />
        <br />
        {description.split("\n\n").map((paragraph: string) => (
          <React.Fragment key={paragraph}>
            <span>{paragraph}</span>
            <br />
            <br />
          </React.Fragment>
        ))}
      </motion.p>
    </motion.div>
  );
}
