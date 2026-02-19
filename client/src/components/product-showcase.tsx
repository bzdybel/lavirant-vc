import { motion } from "framer-motion";
import ImageGallery from "@/components/image-gallery";
import { SectionBackground, SectionHeader } from "@/components/shared";
import { Map, CircleDot, ClipboardList, Pen, Smartphone, Package } from "lucide-react";
import content from "@/lib/content.json";

const { productShowcase } = content;

const ICON_MAP = {
  Map: Map,
  CircleDot: CircleDot,
  ClipboardList: ClipboardList,
  Pen: Pen,
  Smartphone: Smartphone,
  Package: Package,
} as const;

export default function ProductShowcase() {
  const images = productShowcase.images;
  const features = productShowcase.features;

  return (
    <section id="contents" className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden">
      <SectionBackground>
        <div className="container mx-auto px-6 relative z-10">
          <SectionHeader title={productShowcase.title} subtitle={productShowcase.subtitle} />

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
                    <div className="bg-[#c9a24d]/20 border border-[#c9a24d]/40 p-3 rounded-full text-[#c9a24d] mr-4 group-hover:bg-[#c9a24d]/30 transition-all flex-shrink-0">
                      {(() => {
                        const IconComponent = ICON_MAP[feature.icon as keyof typeof ICON_MAP];
                        return <IconComponent className="w-6 h-6" />;
                      })()}
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
      </SectionBackground>
    </section>
  );
}
