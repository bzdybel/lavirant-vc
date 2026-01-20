import { useContent } from "@/hooks/useContent";
import {
  SectionBackground,
  AnimatedSectionTitle,
  ParticleGenerator,
} from "@/components/shared";
import StepCard from "./how-to-play/StepCard";

export default function HowToPlay() {
  const content = useContent();
  const howToPlayData = content?.howToPlay;

  if (!howToPlayData?.steps || howToPlayData.steps.length === 0) {
    return null;
  }

  return (
    <section
      id="how-to-play"
      className="py-24 md:py-36 bg-[#0f2433] text-white relative overflow-hidden"
    >
      <SectionBackground>
        <ParticleGenerator count={15} />
        <div className="container mx-auto px-6 relative z-10">
          <AnimatedSectionTitle
            title={howToPlayData.title}
            subtitle={howToPlayData.subtitle}
          />

          <div className="max-w-3xl mx-auto">
            <ul className="space-y-8">
              {howToPlayData.steps.map((step, index) => (
                <StepCard
                  key={step.number}
                  number={step.number}
                  title={step.title}
                  description={step.description}
                  index={index}
                />
              ))}
            </ul>
          </div>
        </div>
      </SectionBackground>
    </section>
  );
}
