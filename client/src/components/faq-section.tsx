import { useState } from "react";
import { faqData } from "@/lib/faq-data";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQSection() {
  return (
    <section className="py-16 md:py-24 bg-neutral-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-primary-900 mb-4">
            Często Zadawane Pytania
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Wszystko, co musisz wiedzieć o grze Lavirant.
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqData.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <AccordionItem value={`item-${index}`} className="border-b border-neutral-200 py-2">
                  <AccordionTrigger className="text-left font-playfair text-xl font-bold text-primary-900 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-neutral-600">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-neutral-600 mb-4">Masz więcej pytań? Jesteśmy tutaj, aby pomóc!</p>
          <a href="#" className="inline-flex items-center text-primary-700 hover:text-primary-900 font-medium transition-colors">
            <span className="mr-2">Skontaktuj się z naszym zespołem wsparcia</span>
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
          </a>
        </div>
      </div>
    </section>
  );
}
