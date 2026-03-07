import { Truck, Package, Zap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import content from "@/lib/content.json";
import { DeliveryPointPicker } from "@/components/checkout/DeliveryPointPicker";

const { labels } = content.checkout.delivery;

interface DeliveryMethodSelectorProps {
  selectedMethod: string;
  onMethodChange: (_value: string) => void;
  deliveryPointId?: string;
  onDeliveryPointChange?: (_value: string) => void;
}

const ICON_MAP = {
  inpost: Package,
  dpd: Truck,
  "inpost-courier": Zap,
} as const;

interface DeliveryOption {
  id: string;
  name: string;
  price: number;
  estimatedDays: string;
  description: string;
  [key: string]: unknown;
}

const deliveryOptions: DeliveryOption[] = content.checkout.delivery.options.map(opt => ({
  ...opt,
  id: opt.id as keyof typeof ICON_MAP
}));

const formatPrice = (price: number): string => {
  if (price === 0) return labels.free;
  return `${labels.pricePrefix}${price} ${labels.currency}`;
};

export const DeliveryMethodSelector = ({
  selectedMethod,
  onMethodChange,
  deliveryPointId = "",
  onDeliveryPointChange,
}: DeliveryMethodSelectorProps) => {
  return (
    <div className="bg-[#1a3244]/60 rounded-lg border border-white/10 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">{content.checkout.delivery.title}</h3>

      <RadioGroup value={selectedMethod} onValueChange={onMethodChange}>
        <div className="space-y-3">
          {deliveryOptions.map((option) => {
            const Icon = ICON_MAP[option.id as keyof typeof ICON_MAP];
            const isSelected = selectedMethod === option.id;

            return (
              <Label
                key={option.id}
                htmlFor={option.id}
                className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#c9a24d] bg-[#c9a24d]/10"
                    : "border-white/20 hover:border-white/40"
                }`}
              >
                <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                <div className="flex-1">
                  <div>
                    <div className="flex items-center gap-2 text-white font-medium">
                      <Icon className="h-5 w-5" />
                      {option.name}
                      <span className={option.price === 0 ? "text-green-400" : "text-[#c9a24d]"}>
                        {formatPrice(option.price)}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 mt-1">{option.description}</p>
                    <p className="text-xs text-white/50 mt-1">
                      {labels.estimatedDelivery}: {option.estimatedDays}
                    </p>
                  </div>
                  {isSelected && option.id === "inpost" && onDeliveryPointChange ? (
                    <div className="mt-4">
                      <DeliveryPointPicker
                        value={deliveryPointId}
                        onChange={onDeliveryPointChange}
                      />
                    </div>
                  ) : null}
                </div>
              </Label>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
};
