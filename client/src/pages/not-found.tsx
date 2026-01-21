import { Button } from "@/components/ui/button";
import { Home, ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import content from "@/lib/content.json";

const { notFound } = content;


export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0a1929] via-[#0f2433] to-[#1a3244] relative overflow-hidden">
       <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#c9a24d]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-2xl mx-4 text-center"
      >
         <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <h1 className="text-9xl md:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#c9a24d] to-[#e6c46e] leading-none">
            {notFound.title}
          </h1>
        </motion.div>

         <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-6"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            {notFound.subtitle}
          </h2>

          <p className="text-lg text-white/70 max-w-md mx-auto">
            {notFound.description}
          </p>

           <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button
              onClick={() => setLocation("/")}
              size="lg"
              className="bg-[#c9a24d] hover:bg-[#b39143] text-white font-semibold px-8 py-6 text-lg"
            >
              <Home className="mr-2 h-5 w-5" />
              {notFound.homeButton}
            </Button>
            <Button
              onClick={() => setLocation("/#pricing")}
              size="lg"
              variant="outline"
              className="border-[#c9a24d] text-[#c9a24d] hover:bg-[#c9a24d]/10 font-semibold px-8 py-6 text-lg"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              {notFound.shopButton}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
