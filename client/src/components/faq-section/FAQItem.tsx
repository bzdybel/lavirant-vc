import { motion } from "framer-motion";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItemProps {
  id: string;
  question: string;
  answer: string;
  index: number;
}

export default function FAQItem({
  id,
  question,
  answer,
  index,
}: FAQItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
    >
      <AccordionItem
        value={id}
        className="border-b border-[#c9a24d]/20 py-2"
      >
        <AccordionTrigger className="text-left font-playfair text-xl font-bold text-white hover:no-underline hover:text-[#c9a24d] transition-colors">
          {question}
        </AccordionTrigger>
        <AccordionContent className="text-white/70">
          {answer}
        </AccordionContent>
      </AccordionItem>
    </motion.div>
  );
}
