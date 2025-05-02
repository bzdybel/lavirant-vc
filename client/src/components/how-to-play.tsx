import { motion } from "framer-motion";
import { ArrowRight, Package, Users, MessageSquare, Vote, Clock, Award, ChevronRight } from "lucide-react";

export default function HowToPlay() {
  return (
    <section id="jak-grać" className="py-24 md:py-36 bg-[#101538] text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gold particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#f7cb2c]"
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
        <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-[#f7cb2c]/0 via-[#f7cb2c]/20 to-[#f7cb2c]/0"></div>
        <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-[#f7cb2c]/0 via-[#f7cb2c]/20 to-[#f7cb2c]/0"></div>
        
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
              background: "linear-gradient(to right, #f7cb2c, #e69211)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            Rozgrywka i Zawartość
          </motion.h2>
          <motion.p 
            className="text-xl text-white/80 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Lavirant to gra o przekonywaniu, strategii i umiejętności przewidywania zachowań innych graczy
          </motion.p>
        </motion.div>
        
        {/* First row: Zawartość pudełka - image on left, list on right */}
        <div className="flex flex-col lg:flex-row items-center gap-20 mb-32">
          <motion.div 
            className="lg:w-1/2 relative"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800&q=80" 
                alt="Pudełko gry Lavirant" 
                className="w-full h-auto rounded-2xl border border-[#f7cb2c]/30 shadow-2xl" 
              />
              
              {/* Złoty efekt świetlny */}
              <div className="absolute -inset-1 bg-[#f7cb2c]/20 blur-xl rounded-2xl"></div>
              
              {/* Etykiety na zdjęciu */}
              <div className="absolute top-6 left-6 bg-[#192056]/80 backdrop-blur-sm px-5 py-3 rounded-full border border-[#f7cb2c]/20">
                <span className="text-[#f7cb2c] font-medium">Zawartość pudełka</span>
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
              <motion.h3 
                className="font-playfair text-3xl font-bold mb-10 inline-block"
                style={{
                  background: "linear-gradient(to right, #f7cb2c, #e69211)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                Zawartość Pudełka
              </motion.h3>
              
              {/* Gold accent line */}
              <div className="absolute -top-1 left-0 w-24 h-[2px] bg-[#f7cb2c]"></div>
              
              <ul className="space-y-6">
                {[
                  { text: "Plansza do gry", icon: <Package className="h-6 w-6 text-[#f7cb2c]" /> },
                  { text: "30 kart nagrody", icon: <Package className="h-6 w-6 text-[#f7cb2c]" /> },
                  { text: "30 kart kary indywidualnej", icon: <Package className="h-6 w-6 text-[#f7cb2c]" /> },
                  { text: "15 kart kary grupowej", icon: <Package className="h-6 w-6 text-[#f7cb2c]" /> },
                  { text: "9 pionków do gry", icon: <Package className="h-6 w-6 text-[#f7cb2c]" /> },
                  { text: "8 tablic na odpowiedzi", icon: <Package className="h-6 w-6 text-[#f7cb2c]" /> },
                  { text: "Karta odpowiedzi", icon: <Package className="h-6 w-6 text-[#f7cb2c]" /> },
                  { text: "8 markerów z gąbką", icon: <Package className="h-6 w-6 text-[#f7cb2c]" /> },
                ].map((item, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center group"
                  >
                    <div className="mr-4 bg-[#192056] p-3 rounded-full border border-[#f7cb2c]/30 shadow-lg group-hover:border-[#f7cb2c]/50 transition-all duration-300">
                      {item.icon}
                    </div>
                    <span className="text-lg text-white/90 group-hover:text-white transition-colors">{item.text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
        
        {/* Second row: Jak przebiega rozgrywka - text on left, image on right */}
        <div className="flex flex-col lg:flex-row items-center gap-20 mb-32">
          <motion.div 
            className="lg:w-1/2 order-2 lg:order-1"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="relative">
              <motion.h3 
                className="font-playfair text-3xl font-bold mb-10 inline-block"
                style={{
                  background: "linear-gradient(to right, #f7cb2c, #e69211)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                Jak Przebiega Rozgrywka
              </motion.h3>
              
              {/* Gold accent line */}
              <div className="absolute -top-1 left-0 w-24 h-[2px] bg-[#f7cb2c]"></div>
              
              <ul className="space-y-8">
                {[
                  {
                    title: "Przygotowanie",
                    description: "Gracze otrzymują pionki i tablice, a następnie rozstawiają się na planszy.",
                    icon: <Users className="h-6 w-6 text-[#f7cb2c]" />
                  },
                  {
                    title: "Dyskusja",
                    description: "Uczestnicy dyskutują na wylosowany temat, starając się przekonać innych do swoich racji.",
                    icon: <MessageSquare className="h-6 w-6 text-[#f7cb2c]" />
                  },
                  {
                    title: "Głosowanie",
                    description: "Każdy gracz tajnie głosuje, przewidując wybory pozostałych uczestników.",
                    icon: <Vote className="h-6 w-6 text-[#f7cb2c]" />
                  },
                  {
                    title: "Wyniki i Ruch",
                    description: "Po zliczeniu głosów gracze otrzymują punkty i przesuwają pionki w kierunku mety.",
                    icon: <ArrowRight className="h-6 w-6 text-[#f7cb2c]" />
                  }
                ].map((step, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="group"
                  >
                    <div className="flex items-center mb-2">
                      <div className="mr-4 bg-[#192056] p-3 rounded-full border border-[#f7cb2c]/30 shadow-lg group-hover:border-[#f7cb2c]/50 transition-all duration-300">
                        {step.icon}
                      </div>
                      <span className="text-xl font-bold text-white group-hover:text-[#f7cb2c] transition-colors">{step.title}</span>
                    </div>
                    <p className="text-white/80 pl-16">{step.description}</p>
                  </motion.li>
                ))}
              </ul>
              
              <div className="mt-8 pl-16 text-white/60 flex items-center">
                <ChevronRight className="h-4 w-4 mr-2 text-[#f7cb2c]" />
                <span>Celem gry jest dotarcie do mety jako pierwszy!</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="lg:w-1/2 order-1 lg:order-2"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1582921017967-79d1cb6702ee?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800&q=80" 
                alt="Gracze przy stole" 
                className="w-full h-auto rounded-2xl border border-[#f7cb2c]/30 shadow-2xl" 
              />
              
              {/* Złoty efekt świetlny */}
              <div className="absolute -inset-1 bg-[#f7cb2c]/20 blur-xl rounded-2xl"></div>
            </div>
          </motion.div>
        </div>
        
        {/* Dodatkowe informacje - pływające karty */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "5-8 Graczy",
                description: "Idealna rozgrywka z przyjaciółmi i rodziną",
                icon: <Users className="h-10 w-10 text-[#f7cb2c]" />
              },
              {
                title: "45 minut",
                description: "Szybka i dynamiczna rozgrywka",
                icon: <Clock className="h-10 w-10 text-[#f7cb2c]" />
              },
              {
                title: "Od 13 lat",
                description: "Dla nastolatków i dorosłych",
                icon: <Award className="h-10 w-10 text-[#f7cb2c]" />
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="bg-[#192056]/50 backdrop-blur-sm rounded-2xl p-8 border border-[#f7cb2c]/20 shadow-xl group hover:border-[#f7cb2c]/40 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="flex items-center justify-center">
                  <div className="w-20 h-20 bg-[#101538] rounded-full flex items-center justify-center mb-6 border border-[#f7cb2c]/30 shadow-lg group-hover:border-[#f7cb2c]/60 transition-all duration-300">
                    {item.icon}
                  </div>
                </div>
                <h3 className="font-playfair text-xl text-center font-bold text-white mb-2 group-hover:text-[#f7cb2c] transition-colors">
                  {item.title}
                </h3>
                <p className="text-white/70 text-center">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
