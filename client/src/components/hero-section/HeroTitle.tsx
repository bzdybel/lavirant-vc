import { motion } from "framer-motion";
import React from "react";
import UnderlineReveal from "./UnderlineReveal";

interface HeroTitleProps {
  mainTitle: string;
  tagline: string;
  description: string;
  socialProof?: string;
}

export default function HeroTitle({
  mainTitle,
  tagline,
  description,
  socialProof,
}: HeroTitleProps) {
  const highlights = [
    { phrase: "Jedna osoba" },
    { phrase: "Te same pytania" },
    { phrase: "Psychologia i dedukcja" },
  ];

  const renderWithHighlight = (
    line: string,
    phrase: string | undefined,
    bulletDelay = 0
  ) => {
    if (!phrase || !line.includes(phrase)) return line;

    const [before, after] = line.split(phrase);

    return (
      <>
        <span>{before}</span>
        <UnderlineReveal text={phrase} delay={bulletDelay + 0.35} />
        <span>{after}</span>
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center max-w-4xl mx-auto mb-12"
    >
       <h1 className="font-playfair font-bold mb-6">
        <motion.span
          className="block text-6xl md:text-7xl lg:text-8xl !leading-[1.2]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          style={{
            background: "linear-gradient(135deg, #c9a24d, #a67c4a)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {mainTitle}
        </motion.span>
      </h1>

      {/* TAGLINE + BULLETS */}
      <motion.div
        className="text-xl md:text-2xl text-white/80 leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        {tagline}

        <div className="space-y-5 my-8">
          {description.split("\n").map((line, index) => {
            const bulletDelay = 0.45 + index * 0.2;

            return (
              <motion.div
                key={`${index}-${line}`}
                className="text-lg md:text-xl text-white/85 font-medium"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: bulletDelay,
                  ease: "easeOut",
                }}
              >
                {renderWithHighlight(
                  line,
                  highlights[index]?.phrase,
                  bulletDelay
                )}
              </motion.div>
            );
          })}
        </div>

        {socialProof && (
          <div className="mt-8 pt-6 border-t border-[#c9a24d]/30 text-base md:text-lg text-[#c9a24d] font-medium">
            {socialProof}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
