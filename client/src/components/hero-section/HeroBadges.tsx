import { motion } from "framer-motion";
import { Users, Clock, Award } from "lucide-react";
import InfoPill from "@/components/ui/info-pill";

interface HeroBadgesProps {
  players: string;
  time: string;
  age: string;
}

export default function HeroBadges({ players, time, age }: HeroBadgesProps) {
  return (
    <motion.div
      className="flex flex-wrap justify-center gap-6 mb-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      <InfoPill icon={<Users className="h-5 w-5" />}>{players}</InfoPill>
      <InfoPill icon={<Clock className="h-5 w-5" />}>{time}</InfoPill>
      <InfoPill icon={<Award className="h-5 w-5" />}>{age}</InfoPill>
    </motion.div>
  );
}
