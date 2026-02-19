interface SupportBannerProps {
  title: string;
  description: string;
}

export function SupportBanner({ title, description }: SupportBannerProps) {
  return (
    <div className="bg-[#c9a24d]/10 border border-[#c9a24d]/20 rounded-xl p-6 mb-6">
      <p className="text-white/90">
        <span className="font-semibold text-[#c9a24d]">{title}</span>{" "}
        {description}
      </p>
    </div>
  );
}
