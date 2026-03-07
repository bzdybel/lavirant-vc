import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import content from "@/lib/content.json";

const { labels } = content.checkout.paymentMethods;

export const CardDetailsInput = () => {
  return (
    <div
      className="mt-3 ml-10 p-4 bg-[#0f2433]/50 rounded-lg border border-white/10 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div>
        <Label htmlFor="card-number" className="text-white text-sm mb-2 block">
          {labels.cardNumber}
        </Label>
        <Input
          id="card-number"
          name="cardNumber"
          type="text"
          placeholder={labels.cardNumberPlaceholder}
          className="bg-[#0f2433] border-white/20 text-white"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="card-expiry" className="text-white text-sm mb-2 block">
            {labels.cardExpiry}
          </Label>
          <Input
            id="card-expiry"
            name="cardExpiry"
            type="text"
            placeholder={labels.cardExpiryPlaceholder}
            className="bg-[#0f2433] border-white/20 text-white"
          />
        </div>
        <div>
          <Label htmlFor="card-cvv" className="text-white text-sm mb-2 block">
            {labels.cardCvv}
          </Label>
          <Input
            id="card-cvv"
            name="cardCVV"
            type="text"
            maxLength={3}
            placeholder={labels.cardCvvPlaceholder}
            className="bg-[#0f2433] border-white/20 text-white"
          />
        </div>
      </div>
    </div>
  );
};
