import { memo } from "react";
import content from "@/lib/content.json";
import { ParticleGenerator } from "@/components/shared";
import FeatureSection from "@/components/feature-section";
import HeroTitle from "./hero-section/HeroTitle";
import HeroBadges from "./hero-section/HeroBadges";
import HeroButtons from "./hero-section/HeroButtons";

const { hero } = content;

export default memo(function HeroSection() {
  return (
    <section className="relative bg-gradient-to-b from-[#0f2433] via-[#132b3d] to-[#0f2433] text-white overflow-hidden min-h-[100vh] pt-32 pb-16">
      <div className="absolute inset-0 overflow-hidden">
        <ParticleGenerator count={20} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-30" />
        <div className="absolute inset-0 bg-gradient-radial from-[#2d4a5e]/0 to-[#0f2433] opacity-70" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center justify-center mb-24">
          <HeroTitle
            mainTitle={hero.mainTitle}
            tagline={hero.tagline}
            description={hero.description}
          />

          <HeroBadges
            players={hero.badges.players}
            time={hero.badges.time}
            age={hero.badges.age}
          />

          <HeroButtons
            primaryText={hero.buttons.primary}
            secondaryText={hero.buttons.secondary}
          />
        </div>

        {hero.sections?.map((s: any) => (
          <FeatureSection
            key={s.id}
            id={s.id}
            title={s.title}
            text={s.description}
            imageSrc={s.imageSrc}
            imageAlt={s.imageAlt}
            imageBadge={s.imageBadge}
            badges={s.badges}
            reverse={Boolean(s.reverse)}
          />
        ))}
      </div>
    </section>
  );
});
