import { motion } from "framer-motion";

interface PaymentMethodsProps {
  note: string;
  payments: Array<{ id: string; alt: string; src: string }>;
}

export default function PaymentMethods({
  payments,
}: PaymentMethodsProps) {
  return (
    <motion.div
      className="mt-16 text-center text-white/70"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      viewport={{ once: true }}
    >
      <div className="flex justify-center mt-6 space-x-6 flex-wrap gap-4">
        {payments.map((payment) => (
          <motion.img
            key={payment.id}
            src={payment.src}
            alt={payment.alt}
            className="h-8 opacity-70 hover:opacity-100 transition-opacity"
            whileHover={{ scale: 1.1 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
