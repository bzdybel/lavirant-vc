import { useStripe, useElements } from '@stripe/react-stripe-js';
import { useState, useRef, useEffect } from 'react';
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
import { extractFormData } from "@/components/checkout/formUtils";
import { validateCustomerData } from "@/components/checkout/validation";
import { saveFormDataForRedirect, clearSavedFormData } from "@/components/checkout/paymentRedirectUtils";
import { usePaymentRedirect } from "@/hooks/usePaymentRedirect";
import { apiRequest } from "@/lib/queryClient";
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
  const [deliveryPointId, setDeliveryPointId] = useState("");
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

   useEffect(() => {
    if (!STRIPE_CONFIG.isMockMode && stripe && elements) {
      const updatePaymentIntent = async () => {
        try {
          const itemsTotal = productPrice;
          const shipping = shippingCost;

          await apiRequest("POST", "/api/create-payment-intent", {
            amount: totalAmount,
            itemsTotal,
            shippingCost: shipping,
          });

        } catch (error) {
          console.error("Failed to update payment intent:", error);
        }
      };

      updatePaymentIntent();
    }
  }, [totalAmount, stripe, elements, productPrice, shippingCost, quantity]);

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

    if (deliveryMethod === "inpost" && !deliveryPointId.trim()) {
      toast({
        title: "Wybierz paczkomat InPost",
        description: "Wymagamy wyboru paczkomatu dla dostawy do paczkomatu.",
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
      deliveryMethod: deliveryMethod === "inpost" ? "INPOST_PACZKOMAT" : "INPOST_KURIER",
      deliveryPoint: deliveryMethod === "inpost" ? { id: deliveryPointId.trim() } : undefined,
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
      saveFormDataForRedirect({
        ...customerData,
        productId,
        quantity,
        deliveryMethod: deliveryMethod === "inpost" ? "INPOST_PACZKOMAT" : "INPOST_KURIER",
        deliveryPoint: deliveryMethod === "inpost" ? { id: deliveryPointId.trim() } : undefined,
      });
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout?productId=${productId}` },
      redirect: 'if_required',
    });

     if (error) {
      setIsProcessing(false);
      clearSavedFormData();

       const errorMessage =
        error.code === 'incomplete_payment_method' ? "Metoda płatności niekompletna. Spróbuj ponownie." :
        error.code === 'payment_intent_authentication_failure' ? "Uwierzytelnienie płatności nie powiodło się. Spróbuj ponownie." :
        error.message;

      toast({
        title: toastContent.paymentFailed.title,
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

     if (!paymentIntent) {
      setIsProcessing(false);
      toast({
        title: toastContent.paymentFailed.title,
        description: "Nie znaleziono intencji płatności",
        variant: "destructive",
      });
      return;
    }

    switch (paymentIntent.status) {
      case 'succeeded': {
        clearSavedFormData();
        toast({
          title: toastContent.paymentSuccess.title,
          description: toastContent.paymentSuccess.description,
        });
        const orderRequest = createOrderRequest(paymentIntent.id);
        orderMutation.mutate(orderRequest);
        break;
      }

      case 'requires_payment_method':
      case 'canceled':
         setIsProcessing(false);
        clearSavedFormData();
        toast({
          title: "Płatność anulowana",
          description: "Płatność została anulowana. Spróbuj ponownie lub wybierz inny sposób zapłaty.",
          variant: "destructive",
        });
        break;

      case 'requires_action':
         setIsProcessing(false);
        break;

      case 'processing':
         setTimeout(() => {
          if (isProcessing) {
            setIsProcessing(false);
            toast({
              title: "Oczekiwanie na potwierdzenie",
              description: "Przetwarzanie płatności trwa dłużej niż zwykle. Sprawdź status później.",
              variant: "destructive",
            });
          }
        }, 8000);
        break;

      default:
         setIsProcessing(false);
        clearSavedFormData();
        toast({
          title: toastContent.paymentFailed.title,
          description: `Płatność nie powiodła się. Status: ${paymentIntent.status}. Spróbuj ponownie.`,
          variant: "destructive",
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

  const handleDeliveryMethodChange = (method: string) => {
    setDeliveryMethod(method);
    if (method !== "inpost") {
      setDeliveryPointId("");
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <CustomerInfoFields />

      <DeliveryMethodSelector
        selectedMethod={deliveryMethod}
        onMethodChange={handleDeliveryMethodChange}
        deliveryPointId={deliveryPointId}
        onDeliveryPointChange={setDeliveryPointId}
      />

      <PaymentSection />

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
