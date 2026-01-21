import { motion } from "framer-motion";

interface ProductSummaryProps {
  name: string;
  price: number;
  image: string;
}

export default function ProductSummary({ name, price, image }: ProductSummaryProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 mb-8">
      <div className="flex gap-6 items-center">
        <div className="h-64 w-auto flex-shrink-0 overflow-hidden rounded-lg border border-white/20">
          <img src={image} alt={name} className="h-full w-full object-cover object-center" />
        </div>
        <div className="flex flex-col self-start">
          <motion.span
            className="font-playfair text-3xl font-bold"
            style={{
              background: "linear-gradient(to right, #c9a24d, #a67c4a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {name}
          </motion.span>
          <p className="text-lg text-neutral-300">{price.toFixed(2)} zł</p>
        </div>
      </div>
    </div>
  );
}
