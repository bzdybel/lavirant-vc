import { motion } from "framer-motion";

interface FooterBrandProps {
  logoUrl: string;
  logoAlt: string;
  brandName: string;
  description: string;
}

export const FooterBrand = ({ logoUrl, logoAlt, brandName, description }: FooterBrandProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    viewport={{ once: true }}
    className="flex flex-col items-center text-center"
  >
    <div className="flex items-center space-x-3 mb-8">
      <img
        src={logoUrl}
        alt={logoAlt}
        className="h-16 w-auto"
      />
    </div>
    <p className="text-white/70 mb-8 leading-relaxed">{description}</p>
  </motion.div>
);
