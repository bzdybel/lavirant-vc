import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Users, Clock, ArrowRight, Award, MessageCircle } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-b from-[#101538] via-[#141b42] to-[#101538] text-white overflow-hidden min-h-[100vh] pt-32 pb-16">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gold particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#f7cb2c]"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.1
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.5, 0.1]
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5
            }}
          />
        ))}
        
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-30"></div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-[#192056]/0 to-[#101538] opacity-70"></div>
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Hero main section */}
        <div className="flex flex-col items-center justify-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto mb-12"
          >
            <h1 className="font-playfair text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <motion.span 
                className="block"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Odkryj
              </motion.span>
              <motion.span 
                className="block text-6xl md:text-7xl lg:text-8xl mt-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                style={{
                  background: "linear-gradient(135deg, #fad961, #f7971e, #f76b1c)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                Lavirant
              </motion.span>
            </h1>
            
            <motion.p 
              className="text-xl md:text-2xl mb-10 text-white/80 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              Wciągająca gra towarzyska, w której dyskusja, przekonywanie 
              i strategiczne głosowanie decydują o Twoim zwycięstwie
            </motion.p>
            
            <motion.div 
              className="flex flex-wrap justify-center gap-6 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="flex items-center bg-[#192056]/60 px-5 py-3 rounded-full border border-[#f7cb2c]/20">
                <Users className="mr-2 h-5 w-5 text-[#f7cb2c]" />
                <span className="text-white">5-8 graczy</span>
              </div>
              <div className="flex items-center bg-[#192056]/60 px-5 py-3 rounded-full border border-[#f7cb2c]/20">
                <Clock className="mr-2 h-5 w-5 text-[#f7cb2c]" />
                <span className="text-white">Około 45 minut</span>
              </div>
              <div className="flex items-center bg-[#192056]/60 px-5 py-3 rounded-full border border-[#f7cb2c]/20">
                <Award className="mr-2 h-5 w-5 text-[#f7cb2c]" />
                <span className="text-white">Od 13 lat</span>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
            >
              <Link href="/checkout">
                <Button 
                  className="bg-[#f7cb2c] hover:bg-[#e69211] text-[#101538] font-bold px-8 py-6 h-auto rounded-full relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center">
                    <span className="mr-2">Zamów teraz</span>
                    <ArrowRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="absolute inset-0 w-full h-full bg-white/20 transform -translate-x-full skew-x-12 group-hover:translate-x-0 transition-transform duration-700 ease-out"></span>
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="bg-transparent border-2 border-[#f7cb2c] text-[#f7cb2c] hover:bg-[#f7cb2c]/10 px-8 py-6 h-auto rounded-full"
              >
                <span className="mr-2">Zobacz film</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg"
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="h-5 w-5"
                >
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </Button>
            </motion.div>
          </motion.div>
        </div>
        
        {/* First feature section - image left, text right */}
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-32">
          <motion.div 
            className="lg:w-1/2 order-2 lg:order-1"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800&q=80" 
                alt="Gra planszowa Lavirant" 
                className="w-full h-auto rounded-xl shadow-2xl z-10 relative border-2 border-[#f7cb2c]/30" 
              />
              
              {/* Efekt świetlny */}
              <div className="absolute -inset-0.5 bg-[#f7cb2c] opacity-20 blur-lg rounded-xl"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-[#192056] via-[#f7cb2c] to-[#192056] opacity-30 blur-xl rounded-xl"></div>
              
              {/* Badge */}
              <div className="absolute -bottom-5 -right-5 bg-[#f7cb2c] text-[#101538] font-bold py-3 px-6 rounded-full shadow-lg transform rotate-[-3deg]">
                Nowość 2025!
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="lg:w-1/2 order-1 lg:order-2 text-center lg:text-left"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-6" style={{
              background: "linear-gradient(to right, #f7cb2c, #e69211)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              Przekonuj i Argumentuj
            </h2>
            <p className="text-xl mb-6 text-white/80 leading-relaxed">
              Lavirant to nie tylko plansza i pionki. To przede wszystkim dynamiczna gra, w której liczy się siła Twoich argumentów i umiejętność przekonywania innych graczy. 
            </p>
            <p className="text-xl mb-8 text-white/80 leading-relaxed">
              Dyskutuj na różnorodne tematy, odkrywaj strategie i przekonaj innych do swoich racji, aby zdobyć przewagę na planszy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <div className="flex items-center bg-[#192056]/60 px-5 py-3 rounded-full border border-[#f7cb2c]/20">
                <MessageCircle className="mr-2 h-5 w-5 text-[#f7cb2c]" />
                <span className="text-white">Dynamiczne dyskusje</span>
              </div>
              <div className="flex items-center bg-[#192056]/60 px-5 py-3 rounded-full border border-[#f7cb2c]/20">
                <Award className="mr-2 h-5 w-5 text-[#f7cb2c]" />
                <span className="text-white">Zajmująca rozgrywka</span>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Second feature section - text left, image right */}
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            className="lg:w-1/2 text-center lg:text-left"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-6" style={{
              background: "linear-gradient(to right, #f7cb2c, #e69211)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              Tajne Głosowanie i Strategia
            </h2>
            <p className="text-xl mb-6 text-white/80 leading-relaxed">
              Po zakończeniu dyskusji, następuje faza tajnego głosowania. Każda decyzja ma znaczenie, a Twoja umiejętność przewidywania i wpływania na wybory innych graczy decyduje o Twoim sukcesie.
            </p>
            <p className="text-xl mb-8 text-white/80 leading-relaxed">
              Dopiero po zliczeniu głosów odkryjesz, kto był po Twojej stronie, a kto przeciwko Tobie. Zdobywaj punkty za poprawne przewidywania i przesuwaj się w kierunku mety!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <div className="flex items-center bg-[#192056]/60 px-5 py-3 rounded-full border border-[#f7cb2c]/20">
                <Users className="mr-2 h-5 w-5 text-[#f7cb2c]" />
                <span className="text-white">Tajne głosowania</span>
              </div>
              <div className="flex items-center bg-[#192056]/60 px-5 py-3 rounded-full border border-[#f7cb2c]/20">
                <Award className="mr-2 h-5 w-5 text-[#f7cb2c]" />
                <span className="text-white">Strategiczne wybory</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="lg:w-1/2"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1582921017967-79d1cb6702ee?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800&q=80" 
                alt="Gracze przy stole" 
                className="w-full h-auto rounded-xl shadow-2xl z-10 relative border-2 border-[#f7cb2c]/30" 
              />
              
              {/* Efekt świetlny */}
              <div className="absolute -inset-0.5 bg-[#f7cb2c] opacity-20 blur-lg rounded-xl"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-[#192056] via-[#f7cb2c] to-[#192056] opacity-30 blur-xl rounded-xl"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
