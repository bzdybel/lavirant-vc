import { PaymentElement } from '@stripe/react-stripe-js';
import { CreditCard } from "lucide-react";
import { STRIPE_CONFIG } from "@/config/checkout.config";
import content from "@/lib/content.json";

const { mockMode } = content.checkout;

export const PaymentSection = () => {
  if (STRIPE_CONFIG.isMockMode) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">{mockMode.title}</p>
            <p className="text-sm text-yellow-700 mt-1">{mockMode.description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold text-white">Metoda płatności</h3>
      <PaymentElement
        options={{
          layout: {
            type: 'tabs',
            defaultCollapsed: false,
          },
        }}
      />
    </div>
  );
};
