import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Users, Clock, ArrowRight, Award } from "lucide-react";
import React, { memo, useMemo } from "react";
import content from "@/lib/content.json";
import FeatureSection from "@/components/feature-section";
import InfoPill from "@/components/ui/info-pill";

const { hero } = content;

export default memo(function HeroSection(): JSX.Element {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, () => {
      const top = `${Math.random() * 100}%`;
      const left = `${Math.random() * 100}%`;
      const delay = Math.random() * 5;
      const id = `${top}-${left}-${delay}`;
      return {
        id,
        top,
        left,
        opacity: Math.random() * 0.5 + 0.1,
        duration: Math.random() * 5 + 5,
        delay
      };
    });
  }, []);

  return (
    <section className="relative bg-gradient-to-b from-[#0f2433] via-[#132b3d] to-[#0f2433] text-white overflow-hidden min-h-[100vh] pt-32 pb-16">
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute w-1 h-1 rounded-full bg-[#c9a24d]"
            style={{ top: p.top, left: p.left, opacity: p.opacity }}
            animate={{ y: [0, -30, 0], opacity: [0.1, 0.5, 0.1] }}
            transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
          />
        ))}

        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-30" />
        <div className="absolute inset-0 bg-gradient-radial from-[#2d4a5e]/0 to-[#0f2433] opacity-70" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center justify-center mb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center max-w-4xl mx-auto mb-12">
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
                  WebkitTextFillColor: "transparent"
                }}
              >
                {hero.mainTitle}
              </motion.span>
            </h1>

            <motion.p className="text-xl md:text-2xl mb-10 text-white/80 leading-relaxed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }}>
              {hero.tagline}
              <br />
              <br />
              {hero.description.split("\n\n").map((paragraph: string) => (
                <React.Fragment key={paragraph}>
                  <span>{paragraph}</span>
                  <br />
                  <br />
                </React.Fragment>
              ))}
            </motion.p>

            <motion.div className="flex flex-wrap justify-center gap-6 mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }}>
              <InfoPill icon={<Users className="h-5 w-5" />}>{hero.badges.players}</InfoPill>
              <InfoPill icon={<Clock className="h-5 w-5" />}>{hero.badges.time}</InfoPill>
              <InfoPill icon={<Award className="h-5 w-5" />}>{hero.badges.age}</InfoPill>
            </motion.div>

            <motion.div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1 }}>
              <Link href="/checkout">
                <Button className="bg-[#c9a24d] hover:bg-[#a67c4a] text-[#0f2433] font-bold px-8 py-6 h-auto rounded-full relative overflow-hidden group">
                  <span className="relative z-10 flex items-center">
                    <span className="mr-2">{hero.buttons.primary}</span>
                    <ArrowRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="absolute inset-0 w-full h-full bg-white/20 transform -translate-x-full skew-x-12 group-hover:translate-x-0 transition-transform duration-700 ease-out" />
                </Button>
              </Link>

              <Button variant="outline" className="bg-transparent border-2 border-[#c9a24d] text-[#c9a24d] hover:bg-[#c9a24d]/10 px-8 py-6 h-auto rounded-full">
                <span className="mr-2">{hero.buttons.secondary}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {hero.sections?.map((s: any) => (
          <FeatureSection
            key={s.id}
            id={s.id}
            title={s.title}
            text={s.description}
            imageSrc={s.imageSrc}
            imageAlt={s.imageAlt}
            imageBadge={s.imageBadge}
            badges={s.badges}
            reverse={Boolean(s.reverse)}
          />
        ))}
      </div>
    </section>
  );
});
