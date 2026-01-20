import React, { CSSProperties, memo } from "react";
import { motion } from "framer-motion";
import InfoPill from "@/components/ui/info-pill";
import { Users, Award, MessageCircle, Clock } from "lucide-react";
import ImageCard from "@/components/ui/image-card";

export type FeatureBadge = { id?: string; icon?: string; text: string };
export type FeatureSectionProps = {
  id?: string;
  title: string;
  text: string;
  imageSrc: string;
  imageAlt: string;
  badges?: FeatureBadge[];
  reverse?: boolean;
  imageBadge?: string;
};

const FeatureSection = memo(function FeatureSection({
  title,
  text,
  imageSrc,
  imageAlt,
  badges = [],
  reverse = false,
  imageBadge
}: FeatureSectionProps) {
  return (
    <div className={`flex flex-col lg:flex-row gap-16 mb-32 ${reverse ? "" : ""}`}>
      <motion.div
        className={`lg:w-1/2 ${reverse ? "order-2 lg:order-1" : "order-1 lg:order-2"} text-center lg:text-left`}
        initial={{ opacity: 0, x: reverse ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-6" style={gradientTextStyle}>
          {title}
        </h2>
        <p className="text-xl mb-6 text-white/80 leading-relaxed">{text}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
          {badges.map((b) => (
            <InfoPill key={b.id ?? b.text} icon={getIcon(b.icon)}>
              {b.text}
            </InfoPill>
          ))}
        </div>
      </motion.div>

      <motion.div
        className={`lg:w-1/2 ${reverse ? "order-1 lg:order-2" : "order-2 lg:order-1"}`}
        initial={{ opacity: 0, x: reverse ? 50 : -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <ImageCard src={imageSrc} alt={imageAlt} badge={imageBadge} />
      </motion.div>
    </div>
  );
});

const gradientTextStyle: CSSProperties = {
  background: "linear-gradient(to right, #c9a24d, #a67c4a)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent"
};

const iconMap = {
  Users: <Users className="h-5 w-5" />,
  Award: <Award className="h-5 w-5" />,
  MessageCircle: <MessageCircle className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />
} as const;

function getIcon(name?: string): React.ReactNode | undefined {
  if (!name) return undefined;
  return (iconMap as Record<string, React.ReactNode>)[name];
}

export default FeatureSection;
