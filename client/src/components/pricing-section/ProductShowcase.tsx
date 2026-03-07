import { motion } from "framer-motion";
import { Link } from "wouter";

const productBoxImage = "/image.png";

interface Product {
  id: string;
  name: string;
  tagline: string;
  price: number;
  popular: boolean;
  imageSrc?: string;
  imageCaption?: string;
  features: Array<{ id: string; text: string; included: boolean; bold?: boolean }>;
}

interface ProductShowcaseProps {
  product: Product;
  contentTitle: string;
  button: string;
  priceContext?: string;
  priceSubtext?: string;
  valueStatement?: string;
}

export default function ProductShowcase({
  product,
  contentTitle,
  button,
  priceContext,
  priceSubtext,
  valueStatement,
}: ProductShowcaseProps) {
  return (
    <motion.div
      className="max-w-5xl mx-auto mb-32"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
       <div className="bg-[#2d4a5e]/60 backdrop-blur-sm rounded-2xl border border-[#c9a24d]/30 p-8 md:p-12 mb-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

           <motion.div
            className="w-full lg:w-1/2"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <img
              src={productBoxImage}
              alt={product.name}
              className="w-full h-auto object-contain rounded-lg"
            />
          </motion.div>

          {/* Product Content - Right */}
          <div className="w-full lg:w-1/2 flex flex-col">
            <motion.h3
              className="text-3xl md:text-4xl font-bold mb-2"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              {product.name}
            </motion.h3>

            <motion.p
              className="text-xl text-white/70 mb-6"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              viewport={{ once: true }}
            >
              {product.tagline}
            </motion.p>

            <motion.div
              className="mb-8 pb-8 border-b border-[#c9a24d]/20"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl md:text-6xl font-bold text-[#c9a24d]">
                  {product.price}
                </span>
                <span className="text-2xl text-white/80">zł</span>
              </div>

              <div className="space-y-2 mb-5">
                {priceContext && (
                  <p className="text-white/65 text-sm">{priceContext}</p>
                )}
                {priceSubtext && (
                  <p className="text-white/65 text-sm">{priceSubtext}</p>
                )}
              </div>

              {valueStatement && (
                <p className="text-white/70 text-sm italic border-l-2 border-[#c9a24d]/40 pl-4">
                  {valueStatement}
                </p>
              )}
            </motion.div>

            <Link href="/checkout?productId=1">
              <motion.button
                className="w-full md:w-auto px-8 py-4 bg-[#c9a24d] hover:bg-[#a67c4a] text-[#0f2433] font-bold rounded-lg transition-all duration-300 text-lg mt-auto"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                viewport={{ once: true }}
              >
                {button}
              </motion.button>
            </Link>
          </div>
        </div>
      </div>

      {/* BOX CONTENTS */}
      <motion.div
        className="bg-gradient-to-br from-[#2d4a5e]/40 to-transparent rounded-2xl border border-[#c9a24d]/20 p-8 md:p-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <motion.h4 className="text-2xl md:text-3xl font-bold mb-8 text-[#c9a24d]">
          {contentTitle}
        </motion.h4>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {product.features.map((feature) => (
            <li key={feature.id} className="flex items-start gap-4">
              <span className="mt-2 h-2 w-2 rounded-full bg-[#c9a24d]" />
              <span className={`text-white/85 text-lg `}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}
