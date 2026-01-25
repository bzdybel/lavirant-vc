import { useStripe, useElements } from '@stripe/react-stripe-js';
import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";
import { STRIPE_CONFIG, PAYMENT_CONFIG } from "@/config/checkout.config";
import { createOrder, type CreateOrderRequest } from "@/services/orderService";
import { CustomerInfoFields } from "@/components/checkout/CustomerInfoFields";
import { PaymentSection } from "@/components/checkout/PaymentSection";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { DeliveryMethodSelector } from "@/components/checkout/DeliveryMethodSelector";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { extractFormData } from "@/components/checkout/formUtils";
import { validateCustomerData } from "@/components/checkout/validation";
import { saveFormDataForRedirect, clearSavedFormData } from "@/components/checkout/paymentRedirectUtils";
import { usePaymentRedirect } from "@/hooks/usePaymentRedirect";
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
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState("inpost");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [, navigate] = useLocation();
  const formRef = useRef<HTMLFormElement>(null);

  const { pricing, buttons, security, toast: toastContent, delivery, errors } = content.checkout;

  const deliveryCost = delivery.options.find(opt => opt.id === deliveryMethod)?.price || 0;
  const shippingCost = pricing.shippingCost + deliveryCost;
  const productPrice = amount * quantity;
  const totalAmount = productPrice + shippingCost;

  const orderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      setTimeout(() => navigate('/order-success'), PAYMENT_CONFIG.redirectDelay);
    },
    onError: (error) => {
      console.error("Failed to create order:", error);
      setIsProcessing(false);
    },
  });

  usePaymentRedirect({
    orderMutation,
    showToast: toast,
    paymentStatus: {
      succeeded: toastContent.paymentSuccess,
      processing: toastContent.paymentProcessing,
      cancelled: toastContent.paymentCancelled,
    },
  });

  const validateForm = (): boolean => {
    if (!formRef.current) return false;

    const customerData = extractFormData(formRef.current);
    if (!customerData) {
      toast({
        title: errors.configTitle,
        description: errors.configDescription,
        variant: "destructive",
      });
      return false;
    }

    const validationResult = validateCustomerData(customerData);
    if (!validationResult.isValid) {
      toast({
        title: validationResult.error || errors.configTitle,
        description: validationResult.description,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const createOrderRequest = (paymentIntentId: string): CreateOrderRequest => {
    if (!formRef.current) {
      throw new Error("Form reference not available");
    }

    const customerData = extractFormData(formRef.current);
    if (!customerData) {
      throw new Error("Failed to extract form data");
    }

    return {
      productId,
      quantity,
      paymentIntentId,
      ...customerData,
    };
  };

  const handleMockPayment = async () => {
    if (!validateForm()) {
      setIsProcessing(false);
      return;
    }

    toast({
      title: toastContent.mockSuccess.title,
      description: toastContent.mockSuccess.description,
    });

    const orderRequest = createOrderRequest(`mock_pi_${Date.now()}`);
    orderMutation.mutate(orderRequest);
  };

  const handleRealPayment = async () => {
    if (!stripe || !elements) {
      setIsProcessing(false);
      return;
    }

    if (!validateForm()) {
      setIsProcessing(false);
      return;
    }

    const customerData = extractFormData(formRef.current!);
    if (customerData) {
      saveFormDataForRedirect({ ...customerData, productId, quantity });
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout?productId=${productId}` },
      redirect: 'if_required',
    });

    if (error) {
      clearSavedFormData();
      toast({
        title: toastContent.paymentFailed.title,
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      clearSavedFormData();
      toast({
        title: toastContent.paymentSuccess.title,
        description: toastContent.paymentSuccess.description,
      });

      const orderRequest = createOrderRequest(paymentIntent.id);
      orderMutation.mutate(orderRequest);
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
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <CustomerInfoFields />

      <DeliveryMethodSelector
        selectedMethod={deliveryMethod}
        onMethodChange={setDeliveryMethod}
      />

      {STRIPE_CONFIG.isMockMode ? (
        <PaymentMethodSelector
          selectedMethod={paymentMethod}
          onMethodChange={setPaymentMethod}
        />
      ) : (
        <PaymentSection />
      )}

      <OrderSummary
        productName={pricing.productPrice}
        productPrice={productPrice}
        shippingCost={shippingCost}
        totalAmount={totalAmount}
        unitPrice={amount}
        quantity={quantity}
        onQuantityChange={setQuantity}
      />

      <Button
        type="submit"
        disabled={(!stripe && !STRIPE_CONFIG.isMockMode) || isProcessing}
        className="w-full bg-[#c9a24d] hover:bg-[#a67c4a] text-[#0f2433] font-bold py-7 text-xl rounded-full overflow-hidden relative shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <span className="relative z-10">
          {isProcessing ? buttons.processing : `${buttons.pay} ${totalAmount.toFixed(2)} zł`}
        </span>
        <span className="absolute inset-0 w-full h-full bg-white/20 transform -translate-x-full skew-x-12 transition-transform duration-700 ease-out group-hover:translate-x-0"></span>
      </Button>

      <div className="flex flex-col space-y-2 mt-4">
        <div className="flex items-center gap-2 text-sm text-neutral-300">
          <ShieldCheck className="h-4 w-4" />
          <span>{security.securePayment}</span>
        </div>
      </div>
    </form>
  );
}
