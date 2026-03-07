import content from "@/lib/content.json";
import {
  SectionBackground,
  AnimatedSectionTitle,
  ParticleGenerator,
} from "@/components/shared";
import { FeatureCard } from "./guess-lavirant-section/FeatureCard";

const { trueDeduction } = content;

export default function GuessLavrantSection() {
  const features = trueDeduction.features;

  if (!features || features.length === 0) {
    return null;
  }

  return (
    <section
      className="py-16 md:py-24 bg-[#0f2433] text-white relative overflow-hidden"
      id="true-deduction"
    >
      <SectionBackground>
        <ParticleGenerator count={15} />
        <div className="container mx-auto px-6 relative z-10">
          <AnimatedSectionTitle
            title={trueDeduction.title}
            subtitle={trueDeduction.description}
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
      </SectionBackground>
    </section>
  );
}
