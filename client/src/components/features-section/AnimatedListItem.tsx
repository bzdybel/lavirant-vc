import { motion } from "framer-motion";

interface AnimatedListItemProps {
  text: string;
  delay: number;
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({ text, delay }) => (
  <motion.li
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    transition={{ delay }}
    viewport={{ once: true }}
  >
    • {text}
  </motion.li>
);
