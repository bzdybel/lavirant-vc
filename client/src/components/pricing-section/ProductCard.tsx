import { motion } from "framer-motion";
import ProductHeader from "./ProductHeader";
import FeatureList from "./FeatureList";
import ProductFooter from "./ProductFooter";

interface Product {
  id: string;
  name: string;
  tagline: string;
  price: number;
  popular: boolean;
  features: Array<{ id: string; text: string; included: boolean }>;
}

interface ProductCardProps {
  product: Product;
  badge: string;
  button: string;
}

export default function ProductCard({
  product,
  badge,
  button,
}: ProductCardProps) {
  const cardClasses = `
    bg-[#2d4a5e]/60 backdrop-blur-sm rounded-xl overflow-hidden border transition-all
    ${
      product.popular
        ? "border-2 border-[#c9a24d] transform scale-105 z-10 shadow-2xl shadow-[#c9a24d]/20"
        : "border border-[#c9a24d]/20 hover:border-[#c9a24d]/50 hover:-translate-y-2"
    }
  `;

  return (
    <motion.div
      key={product.id}
      className={cardClasses}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      viewport={{ once: true }}
    >
      <ProductHeader
        name={product.name}
        tagline={product.tagline}
        price={product.price}
        popular={product.popular}
        badge={badge}
      />

      <div className="p-6">
        <FeatureList features={product.features} />
        <ProductFooter popular={product.popular} button={button} />
      </div>
    </motion.div>
  );
}
