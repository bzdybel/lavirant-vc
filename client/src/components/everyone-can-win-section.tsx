import content from "@/lib/content.json";
import {
  AnimatedSectionTitle,
  ParticleGenerator,
} from "@/components/shared";
import { FeatureCard } from "./everyone-can-win-section/FeatureCard";

const { everyoneCanWin } = content;

export default function EveryoneCanWinSection() {
  if (!everyoneCanWin.features || everyoneCanWin.features.length === 0) {
    return null;
  }

  const features = everyoneCanWin.features;

  return (
    <section
      className="py-16 md:py-24 bg-[#0f2433] text-white relative overflow-hidden"
      id="everyone-can-win"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ParticleGenerator count={15} />

        <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-[#c9a24d]/0 via-[#c9a24d]/20 to-[#c9a24d]/0"></div>
        <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-[#c9a24d]/0 via-[#c9a24d]/20 to-[#c9a24d]/0"></div>

        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <AnimatedSectionTitle
          title={everyoneCanWin.title}
          subtitle={everyoneCanWin.subtitle}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              id={feature.id}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
