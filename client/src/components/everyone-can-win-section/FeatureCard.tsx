import { motion } from "framer-motion";

interface FeatureCardProps {
  id: string;
  title: string;
  description: string;
  index: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ id, title, description, index }) => {
  const emojiMap: Record<string, string> = {
    "🔄": "🔄",
    "🗣️": "🗣️"
  };

  const firstEmoji = title.split(' ')[0];
  const emoji = emojiMap[firstEmoji] || "🔄";

  return (
    <motion.div
      key={id}
      className="bg-[#2d4a5e]/60 backdrop-blur-sm border border-[#c9a24d]/20 rounded-xl p-8 transition-all hover:border-[#c9a24d]/50 hover:-translate-y-2"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
    >
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 bg-[#0f2433] rounded-full border border-[#c9a24d]/30 text-2xl">
          {emoji}
        </div>
        <div className="flex-1">
          <h3 className="font-playfair text-xl font-bold text-white mb-3">
            {title}
          </h3>
          <p className="text-white/70">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
