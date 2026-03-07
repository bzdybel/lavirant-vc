import { motion } from "framer-motion";
import content from "@/lib/content.json";
import {
  SectionBackgroundWithParticles,
  SectionHeader,
} from "@/components/shared";
import { AnimatedListItem } from "./features-section/AnimatedListItem";

const { aboutGame } = content;

export default function FeaturesSection() {
  return (
    <section
      id="about-game"
      className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden"
    >
      <SectionBackgroundWithParticles>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-24">
            <SectionHeader title={aboutGame.title} />

            <div className="max-w-3xl mx-auto space-y-6 text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
              >
                <h3 className="text-2xl font-bold text-white mb-3">
                  {aboutGame.heading}
                </h3>
                <ul className="space-y-2 text-white/80">
                  {aboutGame.list.map((item) => (
                    <li key={item.id}>{`• ${item.text}`}</li>
                  ))}
                </ul>
              </motion.div>

              <motion.p
                className="text-white/80 text-lg"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
              >
                {aboutGame.description}
              </motion.p>

              <motion.p
                className="text-white/80 text-lg font-bold"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                viewport={{ once: true }}
              >
                {aboutGame.subtitle}
              </motion.p>

              <ul className="space-y-2 text-white/80">
                {aboutGame.insights.map((insight, idx) => (
                  <AnimatedListItem
                    key={insight.id}
                    text={insight.text}
                    delay={0.4 + idx * 0.05}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </SectionBackgroundWithParticles>
    </section>
  );
}
