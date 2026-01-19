import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ShieldCheck, Truck, Lock } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-secondary-500 to-secondary-700 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-6">
          🎲 Gotowy, by sprawdzić, komu naprawdę możesz ufać?
        </h2>
        <p className="text-xl max-w-2xl mx-auto mb-8">
          Dodaj Lavirant do koszyka i przekonaj się, jak cienka jest granica między prawdą a kłamstwem.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
          <Link href="/checkout">
            <Button size="lg" className="bg-white text-secondary-700 hover:bg-neutral-100">
              Zamów Teraz
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="bg-transparent border-2 border-white hover:bg-white/10">
            Dowiedz Się Więcej
          </Button>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-md">
            <Truck className="mr-2 h-4 w-4" />
            <span>Darmowa dostawa 3-5 dni</span>
          </div>
          <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-md">
            <ShieldCheck className="mr-2 h-4 w-4" />
            <span>30-dniowa gwarancja zwrotu pieniędzy</span>
          </div>
          <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-md">
            <Lock className="mr-2 h-4 w-4" />
            <span>Bezpieczna płatność</span>
          </div>
        </div>
      </div>
    </section>
  );
}
