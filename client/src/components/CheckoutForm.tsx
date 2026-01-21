import { useStripe, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, TruckIcon, CreditCard } from "lucide-react";
import { STRIPE_CONFIG, PAYMENT_CONFIG } from "@/config/checkout.config";
import { createOrder } from "@/services/orderService";
import content from "@/lib/content.json";

interface CheckoutFormProps {
  amount: number;
  productId: number;
}

export default function CheckoutForm({ amount, productId }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [, navigate] = useLocation();

  const { pricing, buttons, security, mockMode, toast: toastContent } = content.checkout;
  const shippingCost = pricing.shippingCost;
  const productPrice = amount - shippingCost;

  const orderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      setTimeout(() => navigate('/'), PAYMENT_CONFIG.redirectDelay);
    },
    onError: (error) => {
      console.error("Failed to create order:", error);
      setIsProcessing(false);
    },
  });

  const handleMockPayment = async () => {
    toast({
      title: toastContent.mockSuccess.title,
      description: toastContent.mockSuccess.description,
    });

    orderMutation.mutate({
      productId,
      quantity: 1,
      paymentIntentId: `mock_pi_${Date.now()}`,
    });
  };

  const handleRealPayment = async () => {
    if (!stripe || !elements) return;

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin },
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: toastContent.paymentFailed.title,
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      toast({
        title: toastContent.paymentSuccess.title,
        description: toastContent.paymentSuccess.description,
      });

      orderMutation.mutate({
        productId,
        quantity: 1,
        paymentIntentId: paymentIntent.id,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    if (STRIPE_CONFIG.isMockMode) {
      await handleMockPayment();
    } else {
      await handleRealPayment();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {STRIPE_CONFIG.isMockMode ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">{mockMode.title}</p>
              <p className="text-sm text-yellow-700 mt-1">{mockMode.description}</p>
            </div>
          </div>
        </div>
      ) : (
        <PaymentElement />
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-300">{pricing.productPrice}</span>
          <span className="text-white">{productPrice.toFixed(2)} zł</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-300">{pricing.shipping}</span>
          <span className="text-white">{shippingCost.toFixed(2)} zł</span>
        </div>
        <Separator className="bg-white/20" />
        <div className="flex justify-between font-medium text-lg">
          <span className="text-white">{pricing.total}</span>
          <span className="text-white">{amount.toFixed(2)} zł</span>
        </div>
      </div>

      <Button
        type="submit"
        disabled={(!stripe && !STRIPE_CONFIG.isMockMode) || isProcessing}
        className="w-full bg-[#c9a24d] hover:bg-[#a67c4a] text-[#0f2433] font-bold py-7 text-xl rounded-full overflow-hidden relative shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <span className="relative z-10">
          {isProcessing ? buttons.processing : `${buttons.pay} ${amount.toFixed(2)} zł`}
        </span>
        <span className="absolute inset-0 w-full h-full bg-white/20 transform -translate-x-full skew-x-12 transition-transform duration-700 ease-out group-hover:translate-x-0"></span>
      </Button>

      <div className="flex flex-col space-y-2 mt-4">
        <div className="flex items-center gap-2 text-sm text-neutral-300">
          <ShieldCheck className="h-4 w-4" />
          <span>{security.securePayment}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-300">
          <TruckIcon className="h-4 w-4" />
          <span>{security.freeShipping}</span>
        </div>
      </div>
    </form>
  );
}
