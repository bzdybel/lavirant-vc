import { motion } from "framer-motion";

interface LegalLink {
  text: string;
  href: string;
}

interface FooterLegalProps {
  copyright: string;
  links: LegalLink[];
}

export const FooterLegal = ({ copyright, links }: FooterLegalProps) => (
  <motion.div
    className="border-t border-[#2d4a5e] pt-8 mt-8 flex flex-col md:flex-row justify-between items-center"
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    transition={{ duration: 0.5, delay: 0.4 }}
    viewport={{ once: true }}
  >
    <p className="text-white/40 text-sm mb-6 md:mb-0">{copyright}</p>
    <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-3">
      {links.map((link) => (
        <motion.a
          key={link.href}
          href={link.href}
          className="text-white/40 hover:text-[#c9a24d] text-sm transition-colors"
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          {link.text}
        </motion.a>
      ))}
    </div>
  </motion.div>
);
