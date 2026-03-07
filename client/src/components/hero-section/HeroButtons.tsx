import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface HeroButtonsProps {
  primaryText: string;
  secondaryText: string;
}

export default function HeroButtons({
  primaryText,
  secondaryText,
}: HeroButtonsProps) {
  return (
    <motion.div
      className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1 }}
    >
      <Link href="/checkout">
        <Button className="bg-[#c9a24d] hover:bg-[#a67c4a] text-[#0f2433] font-bold px-8 py-6 h-auto rounded-full relative overflow-hidden group">
          <span className="relative z-10 flex items-center">
            <span className="mr-2">{primaryText}</span>
            <ArrowRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
          </span>
          <span className="absolute inset-0 w-full h-full bg-white/20 transform -translate-x-full skew-x-12 group-hover:translate-x-0 transition-transform duration-700 ease-out" />
        </Button>
      </Link>

      <Button variant="outline" className="bg-transparent border-2 border-[#c9a24d] text-[#c9a24d] hover:bg-[#c9a24d]/10 px-8 py-6 h-auto rounded-full">
        <span className="mr-2">{secondaryText}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </Button>
    </motion.div>
  );
}
