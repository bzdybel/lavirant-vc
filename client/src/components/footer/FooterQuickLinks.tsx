import { motion } from "framer-motion";

interface Link {
  text: string;
  href: string;
}

interface FooterQuickLinksProps {
  title: string;
  links: Link[];
}

const SECTION_TITLE_STYLE = {
  background: "linear-gradient(to right, #c9a24d, #a67c4a)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent"
};

export const FooterQuickLinks = ({ title, links }: FooterQuickLinksProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.1 }}
    viewport={{ once: true }}
    className="flex flex-col items-center text-center"
  >
    <h3 className="font-playfair text-xl font-bold mb-8 inline-block" style={SECTION_TITLE_STYLE}>
      {title}
    </h3>
    <ul className="space-y-4">
      {links.map((item) => (
        <motion.li
          key={item.href}
          whileHover={{ x: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <a href={item.href} className="text-white/70 hover:text-[#c9a24d] transition-colors block">
            {item.text}
          </a>
        </motion.li>
      ))}
    </ul>
  </motion.div>
);
