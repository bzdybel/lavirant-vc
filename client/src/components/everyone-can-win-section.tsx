import { motion } from "framer-motion";
import { Repeat, MessageCircle } from "lucide-react";
import content from "@/lib/content.json";

const { everyoneCanWin } = content;

export default function EveryoneCanWinSection() {
  const features = everyoneCanWin.features;

  return (
    <section className="py-16 md:py-24 bg-[#0f2433] text-white relative overflow-hidden" id="everyone-can-win">
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
            {everyoneCanWin.title}
          </motion.h2>
          <p className="text-white/70 max-w-2xl mx-auto mt-6">
            {everyoneCanWin.subtitle}
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {features.map((feature, index) => {
            const iconMap = {
              "🔄": <Repeat className="h-12 w-12 text-[#c9a24d]" />,
              "🗣️": <MessageCircle className="h-12 w-12 text-[#c9a24d]" />
            };
            const firstEmoji = feature.title.split(' ')[0];
            return (
            <motion.div 
              key={index}
              className="bg-[#2d4a5e]/60 backdrop-blur-sm border border-[#c9a24d]/20 rounded-xl p-8 transition-all hover:border-[#c9a24d]/50 hover:-translate-y-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 bg-[#0f2433] rounded-full border border-[#c9a24d]/30">
                  {iconMap[firstEmoji] || <MessageCircle className="h-12 w-12 text-[#c9a24d]" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-playfair text-xl font-bold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-white/70">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
          })}
        </div>
      </div>
    </section>
  );
}
