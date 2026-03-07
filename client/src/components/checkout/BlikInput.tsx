import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import content from "@/lib/content.json";

const { labels } = content.checkout.paymentMethods;

export const BlikInput = () => {
  const [blikCode, setBlikCode] = useState("");

  const handleBlikChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue.length > 6) return;
    setBlikCode(numericValue);
  };

  return (
    <div
      className="mt-3 ml-10 p-4 bg-[#0f2433]/50 rounded-lg border border-white/10"
      onClick={(e) => e.stopPropagation()}
    >
      <Label htmlFor="blik-code" className="text-white text-sm mb-2 block">
        {labels.blikCode}
      </Label>
      <Input
        id="blik-code"
        name="blikCode"
        type="text"
        maxLength={6}
        placeholder={labels.blikPlaceholder}
        value={blikCode}
        onChange={(e) => handleBlikChange(e.target.value)}
        className="bg-[#0f2433] border-white/20 text-white text-center text-2xl tracking-widest"
      />
      <p className="text-xs text-white/50 mt-2">{labels.blikHelper}</p>
    </div>
  );
};
