import { CreditCard, Smartphone, Building, Wallet } from "lucide-react";
import { MethodSelector } from "./MethodSelector";
import { BlikInput } from "./BlikInput";
import { CardDetailsInput } from "./CardDetailsInput";
import content from "@/lib/content.json";

interface PaymentMethodSelectorProps {
  selectedMethod: string;
  onMethodChange: (_value: string) => void;
}

const ICON_MAP = {
  CreditCard: CreditCard,
  Smartphone: Smartphone,
  Building: Building,
  Wallet: Wallet,
} as const;

interface PaymentOption {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof ICON_MAP;
  [key: string]: unknown;
}

const paymentOptions: PaymentOption[] = content.checkout.paymentMethods.options.map(opt => ({
  ...opt,
  icon: opt.icon as keyof typeof ICON_MAP
}));

const renderPaymentOption = (option: PaymentOption, _isSelected: boolean) => {
  const Icon = ICON_MAP[option.icon];

  return (
    <div>
      <div className="flex items-center gap-2 text-white font-medium">
        <Icon className="h-5 w-5" />
        {option.name}
      </div>
      <p className="text-sm text-white/60 mt-1">{option.description}</p>
    </div>
  );
};

const renderExpandedContent = (option: PaymentOption) => {
  if (option.id === "blik") return <BlikInput />;
  if (option.id === "card") return <CardDetailsInput />;
  return null;
};

export const PaymentMethodSelector = ({
  selectedMethod,
  onMethodChange,
}: PaymentMethodSelectorProps) => {
  return (
    <MethodSelector
      title={content.checkout.paymentMethods.title}
      options={paymentOptions}
      selectedMethod={selectedMethod}
      onMethodChange={onMethodChange}
      renderOption={renderPaymentOption}
      renderExpandedContent={renderExpandedContent}
    />
  );
};
