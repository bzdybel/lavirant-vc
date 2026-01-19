import { reviewData } from "@/lib/review-data";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

export default function Testimonials() {
  return (
    <section id="reviews" className="py-16 md:py-24 bg-gradient-to-br from-primary-900 to-accent-700 text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-4">
            Co Mówią Gracze
          </h2>
          <p className="text-neutral-100 max-w-2xl mx-auto">
            Nie wierz nam na słowo. Posłuchaj opinii naszej społeczności miłośników gier i dedukcji.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviewData.map((review, index) => (
            <motion.div 
              key={index}
              className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white border-opacity-20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center mb-4">
                <img 
                  src={review.avatar} 
                  alt={review.name} 
                  className="w-12 h-12 rounded-full mr-3" 
                />
                <div>
                  <h3 className="font-bold text-lg">{review.name}</h3>
                  <p className="text-neutral-200 text-sm">{review.title}</p>
                </div>
              </div>
              <div className="mb-4 text-secondary-300 flex">
                {Array(5).fill(0).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${i < review.rating ? 'fill-current' : ''}`}
                  />
                ))}
              </div>
              <p className="italic text-neutral-100">
                "{review.comment}"
              </p>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <a href="#" className="inline-flex items-center text-neutral-100 hover:text-secondary-300 transition-colors">
            <span className="mr-2 font-medium">Przeczytaj wszystkie 156 opinii</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
