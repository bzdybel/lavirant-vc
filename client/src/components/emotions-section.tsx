import { motion } from "framer-motion";
import { Heart, MessageCircle, Zap } from "lucide-react";
import { SectionBackground, SectionHeader } from "@/components/shared";
import content from "@/lib/content.json";

const { emotions } = content;

const ICON_MAP: Record<string, React.ReactNode> = {
  "Analizują": <Heart className="h-8 w-8 text-[#c9a24d] flex-shrink-0" />,
  "Wracają": <MessageCircle className="h-8 w-8 text-[#c9a24d] flex-shrink-0" />,
  "Zastanawiają": <Zap className="h-8 w-8 text-[#c9a24d] flex-shrink-0" />
};

export default function EmotionsSection() {
  return (
    <section className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden" id="emotions">
      <SectionBackground>
        <div className="container mx-auto px-6 relative z-10">
          <SectionHeader title={emotions.title} subtitle={emotions.subtitle} />

          <div className="max-w-4xl mx-auto">
            <motion.div
              className="bg-[#2d4a5e]/40 backdrop-blur-sm rounded-2xl border border-[#c9a24d]/20 p-8 md:p-12"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="space-y-6 text-white/90">
                {emotions.points.map((point) => {
                  const firstWord = point.title.split(' ')[0];
                  return (
                  <div key={point.id} className="flex gap-4">
                    {ICON_MAP[firstWord] || <Heart className="h-8 w-8 text-[#c9a24d] flex-shrink-0" />}
                    <div>
                      <h3 className="font-bold text-lg mb-2">{point.title}</h3>
                      <p>{point.description}</p>
                    </div>
                  </div>
                );
                })}
              </div>

              <motion.p
                className="text-center mt-10 text-lg font-playfair italic text-[#c9a24d]"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                viewport={{ once: true }}
              >
                "{emotions.quote}" 🎭
              </motion.p>
            </motion.div>
          </div>
        </div>
      </SectionBackground>
    </section>
  );
}
