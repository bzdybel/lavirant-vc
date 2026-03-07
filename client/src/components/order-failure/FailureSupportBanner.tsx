import { Mail } from "lucide-react";

interface FailureSupportBannerProps {
  title: string;
  description: string;
}

export function FailureSupportBanner({ title, description }: FailureSupportBannerProps) {
  return (
    <div className="bg-[#c9a24d]/10 border border-[#c9a24d]/20 rounded-xl p-6 mb-6">
      <p className="text-white/90">
        <Mail className="inline-block w-5 h-5 mr-2 text-[#c9a24d]" />
        <span className="font-semibold text-[#c9a24d]">{title}</span>{" "}
        {description}
      </p>
    </div>
  );
}
