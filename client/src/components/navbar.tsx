import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-6'}`}>
      {/* Background */}
      <div className="absolute inset-0 bg-[#101538] bg-opacity-90 backdrop-blur-sm transition-all duration-300"></div>
      
      {/* Gold accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#f7cb2c]/0 via-[#f7cb2c] to-[#f7cb2c]/0"></div>
      
      <nav className="container mx-auto px-6 flex justify-between items-center relative z-10">
        <motion.div 
          className="flex items-center space-x-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <img 
            src="https://images.unsplash.com/photo-1606503153255-59d8b2e4739e?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50&q=80" 
            alt="Logo Gry" 
            className="w-12 h-12 rounded-full border-2 border-[#f7cb2c]" 
          />
          <motion.span 
            className="font-playfair text-3xl font-bold" 
            style={{
              background: "linear-gradient(to right, #f7cb2c, #e69211)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Lavirant
          </motion.span>
        </motion.div>
        
        <motion.div 
          className="hidden md:flex items-center space-x-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {["Jak Grać", "O Grze", "Zawartość"].map((item, index) => (
            <motion.a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-white hover:text-[#f7cb2c] transition-colors relative group"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#f7cb2c] transition-all duration-300 group-hover:w-full"></span>
            </motion.a>
          ))}
        </motion.div>
        
        <motion.div 
          className="flex items-center space-x-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Link href="/checkout">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Button 
                className="hidden md:block bg-[#f7cb2c] hover:bg-[#e69211] text-[#101538] font-bold px-6 py-2 rounded-full overflow-hidden relative"
              >
                <span className="relative z-10">Zamów Teraz</span>
                <span className="absolute inset-0 w-full h-full bg-white/20 transform -translate-x-full skew-x-12 transition-transform duration-700 ease-out hover:translate-x-0"></span>
              </Button>
            </motion.div>
          </Link>
          <button 
            className="md:hidden text-white relative overflow-hidden"
            onClick={toggleMenu}
            aria-label="Przełącz menu"
          >
            <AnimatePresence mode="wait">
              {isMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="h-7 w-7" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="h-7 w-7" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
      </nav>
      
      {/* Menu mobilne */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            className="absolute top-full left-0 right-0 bg-[#101538] border-t border-[#f7cb2c]/10"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="container mx-auto px-6 py-4 flex flex-col space-y-4">
              {["Jak Grać", "O Grze", "Zawartość"].map((item, index) => (
                <motion.a 
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className="block py-3 text-white hover:text-[#f7cb2c] transition-colors border-b border-[#192056]"
                  onClick={() => setIsMenuOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                  {item}
                </motion.a>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <Link href="/checkout">
                  <Button 
                    className="w-full bg-[#f7cb2c] hover:bg-[#e69211] text-[#101538] font-bold py-3 rounded-full"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Zamów Teraz
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
