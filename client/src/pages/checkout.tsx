import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Check, ShieldCheck, TruckIcon, CreditCard } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.warn('Missing Stripe public key. Checkout will not work.');
}

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const CheckoutForm = ({ amount, productName }: { amount: number, productName: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [location, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      toast({
        title: "Payment Successful",
        description: "Thank you for your purchase!",
      });

      try {
        await apiRequest("POST", "/api/orders", {
          productId: 1, // Assuming we have product IDs
          quantity: 1,
          paymentIntentId: paymentIntent.id
        });

        setTimeout(() => navigate('/'), 2000);
      } catch (err) {
        console.error("Failed to create order:", err);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${(amount - 4.99).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span>$4.99</span>
        </div>
        <Separator />
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>${amount.toFixed(2)}</span>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-primary-900 hover:bg-primary-700"
      >
        {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
      </Button>

      <div className="flex flex-col space-y-2 mt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          <span>Secure payment processing</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TruckIcon className="h-4 w-4" />
          <span>Free shipping on orders over $50</span>
        </div>
      </div>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [productInfo, setProductInfo] = useState({
    name: "Chrono Quest: Deluxe Edition",
    price: 59.99,
    image: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09"
  });
  const [, navigate] = useLocation();

  useEffect(() => {
    if (stripePromise) {
      apiRequest("POST", "/api/create-payment-intent", { amount: productInfo.price })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch(err => {
          console.error("Error creating payment intent:", err);
        });
    }
  }, [productInfo.price]);

  if (!stripePromise) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container max-w-3xl mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Payment Configuration Error</CardTitle>
              <CardDescription>
                Stripe payment is not properly configured. Please contact support.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate('/')}>Return to Home</Button>
            </CardFooter>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-3xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to shopping
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
            <CardDescription>Complete your purchase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-6 mb-8">
              <div className="flex gap-4 items-center">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                  <img
                    src={productInfo.image}
                    alt={productInfo.name}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div>
                  <h3 className="font-medium">{productInfo.name}</h3>
                  <p className="text-muted-foreground">${productInfo.price.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm amount={productInfo.price} productName={productInfo.name} />
              </Elements>
            ) : (
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <span className="ml-3">Preparing checkout...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
