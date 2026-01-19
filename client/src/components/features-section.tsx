import { featureData } from "@/lib/feature-data";
import { motion } from "framer-motion";
import { 
  Brain, 
  BookOpen, 
  TrendingUp, 
  Users, 
  Palette, 
  PlusCircle, 
  MessageSquare, 
  Vote, 
  Package, 
  Clock, 
  Heart 
} from "lucide-react";

export default function FeaturesSection() {
  // Map to match iconName with the appropriate icon component
  const getIconByName = (iconName: string) => {
    switch (iconName) {
      case "Brain":
        return <Brain className="h-5 w-5" />;
      case "BookOpen":
        return <BookOpen className="h-5 w-5" />;
      case "TrendingUp":
        return <TrendingUp className="h-5 w-5" />;
      case "Users":
        return <Users className="h-5 w-5" />;
      case "Palette":
        return <Palette className="h-5 w-5" />;
      case "PlusCircle":
        return <PlusCircle className="h-5 w-5" />;
      case "MessageSquare":
        return <MessageSquare className="h-5 w-5" />;
      case "Vote":
        return <TrendingUp className="h-5 w-5" />; // Zastępczo używamy TrendingUp jako ikony głosowania
      case "Package":
        return <Package className="h-5 w-5" />;
      case "Clock":
        return <Clock className="h-5 w-5" />;
      case "Heart":
        return <Heart className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <section id="o-grze" className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden">
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
        {/* O GRZE section */}
        <motion.div 
          className="text-center mb-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.h2 
            className="font-playfair text-4xl md:text-5xl font-bold mb-8 inline-block"
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
            O Grze
          </motion.h2>

          <div className="max-w-3xl mx-auto space-y-6 text-left">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-white mb-3">Lavirant to dynamiczna gra towarzyska, która łączy:</h3>
              <ul className="space-y-2 text-white/80">
                <li>• logiczne myślenie,</li>
                <li>• umiejętność czytania ludzi,</li>
                <li>• kontrolę emocji,</li>
                <li>• oraz… perfekcyjne kłamstwo.</li>
              </ul>
            </motion.div>

            <motion.p 
              className="text-white/80 text-lg"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
            >
              W każdej rundzie jeden z graczy zostaje Kłamcą – jedyną osobą, która zna prawdziwe odpowiedzi.
              Pozostali muszą udawać, że je znają, jednocześnie próbując odkryć, kto mówi prawdę, a kto blefuje.
            </motion.p>

            <motion.p 
              className="text-white/80 text-lg font-bold"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
            >
              To gra, w której:
            </motion.p>

            <ul className="space-y-2 text-white/80">
              <motion.li 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                viewport={{ once: true }}
              >
                • poprawna odpowiedź nie zawsze jest bezpieczna,
              </motion.li>
              <motion.li 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                viewport={{ once: true }}
              >
                • pewność siebie bywa pułapką,
              </motion.li>
              <motion.li 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                viewport={{ once: true }}
              >
                • a cisza przy stole mówi więcej niż słowa.
              </motion.li>
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
