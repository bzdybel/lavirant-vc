import { Package, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import content from "@/lib/content.json";

const { summary } = content.checkout;

interface OrderSummaryProps {
  productName: string;
  productPrice: number;
  shippingCost: number;
  totalAmount: number;
  unitPrice: number;
  quantity: number;
  onQuantityChange: (_value: number) => void;
}

export const OrderSummary = ({
  productName,
  productPrice,
  shippingCost,
  totalAmount,
  unitPrice,
  quantity,
  onQuantityChange,
}: OrderSummaryProps) => {
  const handleDecrease = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < 10) {
      onQuantityChange(quantity + 1);
    }
  };

  return (
    <div className="bg-[#1a3244]/60 rounded-lg border border-white/10 p-6">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Package className="h-5 w-5" />
        {summary.title}
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-white/80">
          <span>{productName}</span>
          <span>{unitPrice.toFixed(2)} zł</span>
        </div>

        <div className="flex justify-between items-center text-white/80">
          <span>Ilość</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-[#0f2433] border-white/20 text-white hover:bg-[#1a3244] hover:text-white"
              onClick={handleDecrease}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center font-medium text-white">{quantity}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-[#0f2433] border-white/20 text-white hover:bg-[#1a3244] hover:text-white"
              onClick={handleIncrease}
              disabled={quantity >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex justify-between text-white/80">
          <span>Suma</span>
          <span>{productPrice.toFixed(2)} zł</span>
        </div>

        <div className="flex justify-between text-white/80">
          <span>{summary.shipping}</span>
          <span>{shippingCost.toFixed(2)} zł</span>
        </div>
        <div className="h-px bg-white/10" />
        <div className="flex justify-between text-lg font-semibold text-white">
          <span>{summary.total}</span>
          <span>{totalAmount.toFixed(2)} zł</span>
        </div>
      </div>
    </div>
  );
};
