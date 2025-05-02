import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Facebook, Twitter, Instagram, Youtube, Mail, MapPin, Phone, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="bg-[#0c102e] text-white pt-24 pb-10 relative">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gold border top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#f7cb2c]/0 via-[#f7cb2c]/40 to-[#f7cb2c]/0"></div>
        
        {/* Subtle texture */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]"></div>
        
        {/* Gold particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#f7cb2c]"
            style={{
              top: `${80 + Math.random() * 15}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.3 + 0.1
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center space-x-3 mb-8">
              <img 
                src="https://images.unsplash.com/photo-1606503153255-59d8b2e4739e?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50&q=80" 
                alt="Logo Gry" 
                className="w-12 h-12 rounded-full border-2 border-[#f7cb2c]" 
              />
              <span 
                className="font-playfair text-2xl font-bold"
                style={{
                  background: "linear-gradient(to right, #f7cb2c, #e69211)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                Lavirant
              </span>
            </div>
            <p className="text-white/70 mb-8 leading-relaxed">
              Wciągająca gra towarzyska oparta na dyskusji, przekonywaniu i strategicznym głosowaniu, która spodoba się wszystkim miłośnikom planszówek.
            </p>
            <div className="flex space-x-5">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, index) => (
                <motion.a 
                  key={index}
                  href="#" 
                  className="text-[#f7cb2c] hover:text-[#e69211] transition-colors"
                  whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon className="h-5 w-5" />
                </motion.a>
              ))}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h3 
              className="font-playfair text-xl font-bold mb-8 inline-block"
              style={{
                background: "linear-gradient(to right, #f7cb2c, #e69211)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              Na skróty
            </h3>
            <ul className="space-y-4">
              {[
                { text: "Strona główna", href: "#" },
                { text: "Jak grać", href: "#jak-grać" },
                { text: "O grze", href: "#o-grze" },
                { text: "Zawartość", href: "#zawartość" },
                { text: "Zamów teraz", href: "/checkout" }
              ].map((item, index) => (
                <motion.li 
                  key={index}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <a 
                    href={item.href} 
                    className="text-white/70 hover:text-[#f7cb2c] transition-colors block"
                  >
                    {item.text}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 
              className="font-playfair text-xl font-bold mb-8 inline-block"
              style={{
                background: "linear-gradient(to right, #f7cb2c, #e69211)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              Kontakt
            </h3>
            <ul className="space-y-6">
              <li className="flex items-start group">
                <div className="p-2 bg-[#101538] rounded-full mr-4 border border-[#f7cb2c]/30 group-hover:border-[#f7cb2c] transition-all duration-300">
                  <MapPin className="h-5 w-5 text-[#f7cb2c]" />
                </div>
                <div>
                  <span className="text-white/70 group-hover:text-white/90 transition-colors">
                    ul. Planszowa 123<br />00-001 Warszawa<br />Polska
                  </span>
                </div>
              </li>
              <li className="flex items-center group">
                <div className="p-2 bg-[#101538] rounded-full mr-4 border border-[#f7cb2c]/30 group-hover:border-[#f7cb2c] transition-all duration-300">
                  <Phone className="h-5 w-5 text-[#f7cb2c]" />
                </div>
                <span className="text-white/70 group-hover:text-white/90 transition-colors">
                  +48 123 456 789
                </span>
              </li>
              <li className="flex items-center group">
                <div className="p-2 bg-[#101538] rounded-full mr-4 border border-[#f7cb2c]/30 group-hover:border-[#f7cb2c] transition-all duration-300">
                  <Mail className="h-5 w-5 text-[#f7cb2c]" />
                </div>
                <span className="text-white/70 group-hover:text-white/90 transition-colors">
                  kontakt@lavirant.pl
                </span>
              </li>
            </ul>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h3 
              className="font-playfair text-xl font-bold mb-8 inline-block"
              style={{
                background: "linear-gradient(to right, #f7cb2c, #e69211)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              Newsletter
            </h3>
            <p className="text-white/70 mb-6 leading-relaxed">
              Bądź na bieżąco z nowościami i ofertami specjalnymi. Zapisz się do naszego newslettera.
            </p>
            <form className="flex">
              <Input 
                type="email" 
                placeholder="Twój email" 
                className="bg-[#101538] text-white placeholder-white/40 rounded-l-md rounded-r-none border border-[#f7cb2c]/30 focus-visible:ring-1 focus-visible:ring-[#f7cb2c] focus-visible:border-[#f7cb2c]"
              />
              <Button 
                className="bg-[#f7cb2c] hover:bg-[#e69211] text-[#101538] font-medium rounded-l-none rounded-r-md flex items-center px-4"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        </div>
        
        <motion.div 
          className="border-t border-[#192056] pt-8 mt-8 flex flex-col md:flex-row justify-between items-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <p className="text-white/40 text-sm mb-6 md:mb-0">
            © 2025 Lavirant Games. Wszelkie prawa zastrzeżone.
          </p>
          <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-3">
            {["Regulamin", "Polityka Prywatności", "Polityka Cookies"].map((text, index) => (
              <motion.a 
                key={index}
                href="#" 
                className="text-white/40 hover:text-[#f7cb2c] text-sm transition-colors"
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                {text}
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
