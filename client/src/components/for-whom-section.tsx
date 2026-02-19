import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { SectionBackground, SectionHeader } from "@/components/shared";
import content from "@/lib/content.json";

const { forWhom } = content;

export default function ForWhomSection() {
  return (
    <section className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden" id="for-whom">
      <SectionBackground>
        <div className="container mx-auto px-6 relative z-10">
          <SectionHeader title={forWhom.title} subtitle={forWhom.subtitle} />

          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {forWhom.items.map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-start p-6 bg-[#2d4a5e]/40 backdrop-blur-sm rounded-xl border border-[#c9a24d]/20 hover:border-[#c9a24d]/40 transition-all"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <CheckCircle className="h-6 w-6 text-[#c9a24d] mr-4 flex-shrink-0 mt-0.5" />
                  <p className="text-white/90">{item}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </SectionBackground>
    </section>
  );
}
