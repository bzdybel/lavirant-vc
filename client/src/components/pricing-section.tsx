import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { productData } from "@/lib/product-data";

export default function PricingSection() {
  return (
    <section id="pricing" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-primary-900 mb-4">
            Wybierz Swoją Edycję
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Wybierz idealną wersję gry Lavirant, która pasuje do Twoich zainteresowań historycznych.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {productData.map((product, index) => (
            <motion.div 
              key={index}
              className={`
                bg-neutral-50 rounded-xl overflow-hidden shadow-lg border transition-transform
                ${product.popular 
                  ? 'border-2 border-secondary-500 transform scale-105 z-10' 
                  : 'border-neutral-200 hover:-translate-y-2'
                }
              `}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className={`p-6 ${product.popular ? 'bg-secondary-500 text-white' : 'bg-neutral-100 border-b border-neutral-200'}`}>
                {product.popular && (
                  <div className="bg-white text-secondary-700 text-xs font-bold uppercase py-1 px-3 rounded-full inline-block mb-2">
                    Najpopularniejsza
                  </div>
                )}
                <h3 className={`font-playfair text-2xl font-bold mb-1 ${product.popular ? 'text-white' : 'text-primary-900'}`}>
                  {product.name}
                </h3>
                <p className={`${product.popular ? 'text-neutral-100' : 'text-neutral-500'} mb-4`}>
                  {product.tagline}
                </p>
                <div className="flex items-end">
                  <span className={`text-4xl font-bold ${product.popular ? 'text-white' : 'text-primary-900'}`}>{product.price} zł</span>
                </div>
              </div>
              
              <div className="p-6">
                <ul className="space-y-3">
                  {product.features.map((feature, i) => (
                    <li key={i} className={`flex items-start ${!feature.included ? 'opacity-50' : ''}`}>
                      {feature.included ? (
                        <Check className="text-green-500 h-5 w-5 mt-1 mr-3 flex-shrink-0" />
                      ) : (
                        <X className="text-red-500 h-5 w-5 mt-1 mr-3 flex-shrink-0" />
                      )}
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
                
                <Link href="/checkout">
                  <Button className={`w-full mt-8 ${
                    product.popular
                      ? 'bg-secondary-500 hover:bg-secondary-700' 
                      : 'bg-primary-900 hover:bg-primary-700'
                    } text-white py-3`}
                  >
                    Dodaj do Koszyka
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-12 text-center text-neutral-500">
          <p>Darmowa dostawa przy zamówieniach powyżej 200 zł. Dostępna wysyłka międzynarodowa.</p>
          <div className="flex justify-center mt-4 space-x-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-8" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-8" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-8" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-8" />
          </div>
        </div>
      </div>
    </section>
  );
}
