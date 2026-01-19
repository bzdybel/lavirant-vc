import { motion } from "framer-motion";
import { ArrowRight, Package, Users, MessageSquare, Vote, Clock, Award, ChevronRight } from "lucide-react";

export default function HowToPlay() {
  return (
    <section id="jak-wyglada-rozgrywka" className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden">
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
            Jak Wygląda Rozgrywka
          </motion.h2>
          <motion.p 
            className="text-xl text-white/80 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Proste zasady, emocjonujące momenty
          </motion.p>
        </motion.div>
        
        {/* Game flow steps */}
        <div className="max-w-3xl mx-auto">
          <ul className="space-y-8">
            {[
              {
                number: "1",
                title: "Każdy gracz odpowiada na pytania – w tajemnicy.",
                description: "Prowadzący losuje pytania z aplikacji. Wszyscy zapisują odpowiedzi na swoich tablicach. Tajemnica jest kluczowa!",
                icon: <MessageSquare className="h-6 w-6 text-[#c9a24d]" />
              },
              {
                number: "2",
                title: "Jedna osoba zna prawdziwe odpowiedzi i próbuje się nie zdradzić.",
                description: "To jest Kłamca – gracz z tablicą LAVIRANT. Pozostali muszą udawać, że znają prawdę, jednocześnie próbując odkryć, kto kłamie.",
                icon: <Users className="h-6 w-6 text-[#c9a24d]" />
              },
              {
                number: "3",
                title: "Po rundzie rozpoczyna się dyskusja i głosowanie.",
                description: "Gracze debatują, analizują odpowiedzi i próbują ustalić tożsamość Kłamcy. Napięcie rośnie!",
                icon: <Vote className="h-6 w-6 text-[#c9a24d]" />
              },
              {
                number: "4",
                title: "Jeśli gracze wskażą Kłamcę – ponosi konsekwencje.",
                description: "Kłamca wraca na start lub losuje kartę kary. Gracze, którzy głosowali prawidłowo, mogą otrzymać nagrodę.",
                icon: <Award className="h-6 w-6 text-[#c9a24d]" />
              },
              {
                number: "5",
                title: "Jeśli nie – Kłamca przejmuje kontrolę nad rozgrywką.",
                description: "Kłamca cofina pozostałych graczy o wynik kostki. Niewinni gracze, którzy zostali oskarżeni, otrzymują nagrodę.",
                icon: <ArrowRight className="h-6 w-6 text-[#c9a24d]" />
              },
              {
                number: "6",
                title: "Gra toczy się do momentu, aż ktoś pierwszy dotrze do mety.",
                description: "Lub skończy się pytania – wtedy wygrywa osoba zajmująca najdalsze pole na planszy!",
                icon: <ChevronRight className="h-6 w-6 text-[#c9a24d]" />
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
                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2d4a5e] border border-[#c9a24d]/30 group-hover:border-[#c9a24d]/60 transition-all">
                      <span className="text-lg font-bold text-[#c9a24d]">{step.number}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-[#c9a24d] transition-colors mb-2">
                      {step.title}
                    </h3>
                    <p className="text-white/80">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

