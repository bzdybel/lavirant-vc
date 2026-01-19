import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ShieldCheck, Truck, Lock } from "lucide-react";
import content from "@/lib/content.json";

const { cta } = content;

export default function CTASection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-secondary-500 to-secondary-700 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-6">
          {cta.heading}
        </h2>
        <p className="text-xl max-w-2xl mx-auto mb-8">
          {cta.description}
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
          <Link href="/checkout">
            <Button size="lg" className="bg-white text-secondary-700 hover:bg-neutral-100">
              {cta.buttons.primary}
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="bg-transparent border-2 border-white hover:bg-white/10">
            {cta.buttons.secondary}
          </Button>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          {cta.benefits.map((benefit, idx) => {
            const iconMap = {
              "Truck": <Truck className="mr-2 h-4 w-4" />,
              "ShieldCheck": <ShieldCheck className="mr-2 h-4 w-4" />,
              "Lock": <Lock className="mr-2 h-4 w-4" />
            };
            return (
            <div key={idx} className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-md">
              {iconMap[benefit.icon]}
              <span>{benefit.text}</span>
            </div>
          );
          })}
        </div>
      </div>
    </section>
  );
}
