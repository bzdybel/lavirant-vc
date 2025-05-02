import { motion } from "framer-motion";
import ImageGallery from "@/components/image-gallery";

export default function ProductShowcase() {
  // Images for the gallery
  const images = [
    "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80",
    "https://images.unsplash.com/photo-1611996575749-79a3a250f948?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80",
    "https://images.unsplash.com/photo-1606503153255-59d8b2e4739e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80",
    "https://images.unsplash.com/photo-1637425087238-14862006e2d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80"
  ];

  const features = [
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M3 7l6 6 2-2-6-6 2-2 8 8V3l-4 4-8-8-2 2 8 8-4 4h8L9 9l-2 2 6 6-2 2-8-8V3l4 4 8-8 2 2-8 8 4 4h-8l6-6Z"></path></svg>,
      title: "Historical Timeline Board",
      description: "A beautifully illustrated fold-out board featuring a grand timeline of history from ancient civilizations to modern times."
    },
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"></path><path d="M12 4v16"></path><path d="M4 12h16"></path></svg>,
      title: "Game Pieces & Tokens",
      description: "6 player tokens representing different historical figures, plus 50 knowledge tokens and 20 achievement medals."
    },
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M21 8v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8"></path><path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v4H3V4Z"></path><path d="M10 12h4"></path></svg>,
      title: "500 Challenge Cards",
      description: "Diverse categories of historical knowledge including Events, Figures, Inventions, Culture, and Geography across five difficulty levels."
    },
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>,
      title: "Historical Companion Guide",
      description: "A 64-page illustrated guide with fascinating historical facts, gameplay instructions, and learning resources."
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-neutral-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-primary-900 mb-4">
            What's Inside the Box
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Chrono Quest comes with everything you need for an immersive historical gaming experience.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="space-y-8">
              {features.map((feature, index) => (
                <motion.div 
                  key={index} 
                  className="flex items-start"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="bg-secondary-500 p-3 rounded-full text-white mr-4">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-playfair text-xl font-bold text-primary-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-neutral-600">
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
