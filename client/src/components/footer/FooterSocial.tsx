import { motion } from "framer-motion";
import { Facebook, Instagram } from "lucide-react";
import { TikTokIcon } from "../shared/TikTokIcon";

interface SocialPlatform {
  name: string;
  icon: string;
  url: string;
  ariaLabel: string;
}

interface FooterSocialProps {
  platforms: SocialPlatform[];
}

const ICON_MAP = {
  Facebook,
  Instagram,
  TikTok: TikTokIcon,
} as const;

export const FooterSocial = ({ platforms }: FooterSocialProps) => (
  <div className="flex space-x-5 justify-center">
    {platforms.map((platform) => {
      const Icon = ICON_MAP[platform.icon as keyof typeof ICON_MAP];
      if (!Icon) return null;

      return (
        <motion.a
          key={platform.name}
          href={platform.url}
          className="text-[#c9a24d] hover:text-[#a67c4a] transition-colors"
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.9 }}
          aria-label={platform.ariaLabel}
        >
          <Icon className="h-5 w-5" />
        </motion.a>
      );
    })}
  </div>
);
