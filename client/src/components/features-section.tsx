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
    <section id="features" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-primary-900 mb-4">
            Funkcje Gry
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Odkryj, co sprawia, że Lavirant jest idealną grą towarzyską opartą na dyskusji i głosowaniu grupowym.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureData.map((feature, index) => (
            <motion.div 
              key={index}
              className="bg-neutral-50 rounded-xl shadow-md overflow-hidden transition-transform hover:-translate-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="h-48 overflow-hidden">
                <img 
                  src={feature.image} 
                  alt={feature.title} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="p-6">
                <h3 className="font-playfair text-xl font-bold text-primary-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-600 mb-4">
                  {feature.description}
                </p>
                <div className="flex items-center text-secondary-500">
                  <span className="mr-2">{getIconByName(feature.iconName)}</span>
                  <span className="font-medium">{feature.highlight}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
