import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useContent } from "@/hooks/useContent";
import { SectionBackground, SectionHeader } from "@/components/shared";
import { Accordion } from "@/components/ui/accordion";
import FAQItem from "./faq-section/FAQItem";

export default function FAQSection() {
  const content = useContent();
  const faqSection = content?.faq;

  if (!faqSection?.faqs || faqSection.faqs.length === 0) {
    return null;
  }

  return (
    <section
      id="faq"
      className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden"
    >
      <SectionBackground>
        <div className="container mx-auto px-6 relative z-10">
          <SectionHeader
            title={faqSection.title}
            subtitle={faqSection.subtitle}
          />

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqSection.faqs.map((faq, index) => (
                <FAQItem
                  key={faq.id}
                  id={faq.id}
                  question={faq.question}
                  answer={faq.answer}
                  index={index}
                />
              ))}
            </Accordion>
          </div>

          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <p className="text-white/70 mb-6">{faqSection.contactText}</p>
            <motion.a
              href="#"
              className="inline-flex items-center text-[#c9a24d] hover:text-[#a67c4a] font-medium transition-colors"
              whileHover={{ x: 5 }}
            >
              <span className="mr-2">{faqSection.contactCTA}</span>
              <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            </motion.a>
          </motion.div>
        </div>
      </SectionBackground>
    </section>
  );
}
