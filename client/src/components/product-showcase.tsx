import { motion } from "framer-motion";
import ImageGallery from "@/components/image-gallery";
import content from "@/lib/content.json";

const { productShowcase } = content;

export default function ProductShowcase() {
  // Images for the gallery
  const images = [
    "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80",
    "https://images.unsplash.com/photo-1611996575749-79a3a250f948?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80",
    "https://images.unsplash.com/photo-1606503153255-59d8b2e4739e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80",
    "https://images.unsplash.com/photo-1637425087238-14862006e2d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80"
  ];

  const features = productShowcase.features;

  return (
    <section id="contents" className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden">
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
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.h2 
            className="font-playfair text-4xl md:text-5xl font-bold mb-6 inline-block"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            style={{
              background: "linear-gradient(to right, #c9a24d, #a67c4a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            {productShowcase.title}
          </motion.h2>
          <p className="text-white/70 max-w-2xl mx-auto mt-6">
            {productShowcase.subtitle}
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="space-y-8">
              {features.map((feature, index) => (
                <motion.div 
                  key={index} 
                  className="flex items-start group"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="bg-[#c9a24d]/20 border border-[#c9a24d]/40 p-3 rounded-full text-[#c9a24d] mr-4 group-hover:bg-[#c9a24d]/30 transition-all">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-playfair text-xl font-bold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-white/70">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <motion.div 
            className="order-1 lg:order-2"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <ImageGallery images={images} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
