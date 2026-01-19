import { motion } from "framer-motion";
import { Heart, MessageCircle, Zap } from "lucide-react";
import content from "@/lib/content.json";

const { emotions } = content;

export default function EmotionsSection() {
  return (
    <section className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden" id="emotions">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gold particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
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
            {emotions.title}
          </motion.h2>
          <motion.p 
            className="text-xl text-white/80 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            {emotions.subtitle}
          </motion.p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div 
            className="bg-[#2d4a5e]/40 backdrop-blur-sm rounded-2xl border border-[#c9a24d]/20 p-8 md:p-12"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="space-y-6 text-white/90">
              {emotions.points.map((point, idx) => {
                const iconMap = {
                  "Analizują": <Heart className="h-8 w-8 text-[#c9a24d] flex-shrink-0" />,
                  "Wracają": <MessageCircle className="h-8 w-8 text-[#c9a24d] flex-shrink-0" />,
                  "Zastanawiają": <Zap className="h-8 w-8 text-[#c9a24d] flex-shrink-0" />
                };
                const firstWord = point.title.split(' ')[0];
                return (
                <div key={idx} className="flex gap-4">
                  {iconMap[firstWord] || <Heart className="h-8 w-8 text-[#c9a24d] flex-shrink-0" />}
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
    </section>
  );
}
