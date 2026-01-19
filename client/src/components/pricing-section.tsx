import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { productData } from "@/lib/product-data";

export default function PricingSection() {
  return (
    <section id="ceny" className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gold particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#c9a24d]"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.3 + 0.1
            }}
            animate={{
              y: [0, -40, 0],
              opacity: [0.1, 0.4, 0.1]
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5
            }}
          />
        ))}
        
        {/* Gold accent lines */}
        <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-[#c9a24d]/0 via-[#c9a24d]/20 to-[#c9a24d]/0"></div>
        <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-[#c9a24d]/0 via-[#c9a24d]/20 to-[#c9a24d]/0"></div>
        
        {/* Background texture */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
 
        
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-8 max-w-lg">
          {productData.map((product, index) => (
            <motion.div 
              key={index}
              className={`
                bg-[#2d4a5e]/60 backdrop-blur-sm rounded-xl overflow-hidden border transition-all
                ${product.popular 
                  ? 'border-2 border-[#c9a24d] transform scale-105 z-10 shadow-2xl shadow-[#c9a24d]/20' 
                  : 'border border-[#c9a24d]/20 hover:border-[#c9a24d]/50 hover:-translate-y-2'
                }
              `}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className={`p-6 border-b border-[#c9a24d]/20 ${product.popular ? 'bg-gradient-to-r from-[#c9a24d]/20 to-[#a67c4a]/10' : ''}`}>
                {product.popular && (
                  <div className="bg-[#c9a24d] text-[#0f2433] text-xs font-bold uppercase py-1 px-3 rounded-full inline-block mb-2">
                    Najpopularniejsza
                  </div>
                )}
                <h3 className="font-playfair text-2xl font-bold mb-1 text-white">
                  {product.name}
                </h3>
                <p className="text-white/70 mb-4">
                  {product.tagline}
                </p>
                <div className="flex items-end">
                  <span className="text-4xl font-bold text-[#c9a24d]">{product.price} zł</span>
                </div>
              </div>
              
              <div className="p-6">
                <ul className="space-y-3">
                  {product.features.map((feature, i) => (
                    <li key={i} className={`flex items-start ${!feature.included ? 'opacity-40' : ''}`}>
                      {feature.included ? (
                        <Check className="text-[#c9a24d] h-5 w-5 mt-1 mr-3 flex-shrink-0" />
                      ) : (
                        <X className="text-white/50 h-5 w-5 mt-1 mr-3 flex-shrink-0" />
                      )}
                      <span className="text-white/90">{feature.text}</span>
                    </li>
                  ))}
                </ul>
                
                <Link href="/checkout">
                  <Button className={`w-full mt-8 font-bold py-3 rounded-lg transition-all ${
                    product.popular
                      ? 'bg-[#c9a24d] hover:bg-[#a67c4a] text-[#0f2433]' 
                      : 'bg-[#c9a24d]/20 hover:bg-[#c9a24d]/30 text-white border border-[#c9a24d]/50'
                    }`}
                  >
                    Dodaj do Koszyka
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
          </div>
        </div>
        
        <motion.div 
          className="mt-16 text-center text-white/70"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="mb-6">Darmowa dostawa przy zamówieniach powyżej 200 zł. Dostępna wysyłka międzynarodowa.</p>
          <div className="flex justify-center mt-6 space-x-6 flex-wrap gap-4">
            <motion.img 
              src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" 
              alt="Visa" 
              className="h-8 opacity-70 hover:opacity-100 transition-opacity" 
              whileHover={{ scale: 1.1 }}
            />
            <motion.img 
              src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" 
              alt="Mastercard" 
              className="h-8 opacity-70 hover:opacity-100 transition-opacity" 
              whileHover={{ scale: 1.1 }}
            />
            <motion.img 
              src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" 
              alt="PayPal" 
              className="h-8 opacity-70 hover:opacity-100 transition-opacity" 
              whileHover={{ scale: 1.1 }}
            />
            <motion.img 
              src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" 
              alt="Stripe" 
              className="h-8 opacity-70 hover:opacity-100 transition-opacity" 
              whileHover={{ scale: 1.1 }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
