import { Check, X } from "lucide-react";

interface FeatureListProps {
  features: Array<{ id: string; text: string; included: boolean }>;
}

export default function FeatureList({ features }: FeatureListProps) {
  return (
    <ul className="space-y-3">
      {features.map((feature) => (
        <li
          key={feature.id}
          className={`flex items-start ${!feature.included ? "opacity-40" : ""}`}
        >
          {feature.included ? (
            <Check className="text-[#c9a24d] h-5 w-5 mt-1 mr-3 flex-shrink-0" />
          ) : (
            <X className="text-white/50 h-5 w-5 mt-1 mr-3 flex-shrink-0" />
          )}
          <span className="text-white/90">{feature.text}</span>
        </li>
      ))}
    </ul>
  );
}
