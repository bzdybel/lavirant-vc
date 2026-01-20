import { ReactNode } from "react";
import ParticleGenerator from "./ParticleGenerator";

interface SectionBackgroundProps {
  children: ReactNode;
  particleCount?: number;
}

export default function SectionBackground({
  children,
  particleCount = 15,
}: SectionBackgroundProps) {
  return (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ParticleGenerator count={particleCount} />

        <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-[#c9a24d]/0 via-[#c9a24d]/20 to-[#c9a24d]/0"></div>
        <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-[#c9a24d]/0 via-[#c9a24d]/20 to-[#c9a24d]/0"></div>

        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]"></div>
      </div>

      {children}
    </>
  );
}
