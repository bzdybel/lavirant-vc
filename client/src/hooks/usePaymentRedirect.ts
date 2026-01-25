import { useEffect } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import type { UseMutationResult } from '@tanstack/react-query';
import type { CreateOrderRequest } from '@/services/orderService';
import {
  getPaymentIntentClientSecret,
  retrieveSavedFormData,
  clearSavedFormData,
  createOrderFromSavedData,
} from '@/components/checkout/paymentRedirectUtils';

interface PaymentStatus {
  succeeded: {
    title: string;
    description: string;
  };
  processing: {
    title: string;
    description: string;
  };
  cancelled: {
    title: string;
    description: string;
  };
}

interface UsePaymentRedirectParams {
  orderMutation: UseMutationResult<any, Error, CreateOrderRequest, unknown>;
  showToast: (config: { title: string; description: string; variant?: 'destructive' }) => void;
  paymentStatus: PaymentStatus;
}

export function usePaymentRedirect({
  orderMutation,
  showToast,
  paymentStatus
}: UsePaymentRedirectParams) {
  const stripe = useStripe();

  useEffect(() => {
    if (!stripe) return;

    const clientSecret = getPaymentIntentClientSecret();
    if (!clientSecret) return;

    handlePaymentReturn(clientSecret);
  }, [stripe]);

  async function handlePaymentReturn(clientSecret: string) {
    if (!stripe) return;

    const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

    if (!paymentIntent) return;

    switch (paymentIntent.status) {
      case 'succeeded':
        handleSuccessfulPayment(paymentIntent.id);
        break;
      case 'processing':
        showPaymentProcessing();
        break;
      case 'requires_payment_method':
        showPaymentCancelled();
        break;
    }
  }

  function handleSuccessfulPayment(paymentIntentId: string) {
    const savedData = retrieveSavedFormData();

    if (!savedData) return;

    const orderRequest = createOrderFromSavedData(paymentIntentId, savedData);
    orderMutation.mutate(orderRequest);
    clearSavedFormData();

    showToast({
      title: paymentStatus.succeeded.title,
      description: paymentStatus.succeeded.description,
    });
  }

  function showPaymentProcessing() {
    showToast({
      title: paymentStatus.processing.title,
      description: paymentStatus.processing.description,
    });
  }

  function showPaymentCancelled() {
    showToast({
      title: paymentStatus.cancelled.title,
      description: paymentStatus.cancelled.description,
      variant: 'destructive',
    });
  }
}
