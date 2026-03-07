import { CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageLayout from "./PageLayout";
import CheckoutCard from "./CheckoutCard";
import content from "@/lib/content.json";

interface ErrorStateProps {
  onNavigateHome: () => void;
}

export default function ErrorState({ onNavigateHome }: ErrorStateProps) {
  return (
    <PageLayout>
      <CheckoutCard>
        <CardHeader>
          <CardTitle className="text-white">{content.checkout.errors.configTitle}</CardTitle>
          <CardDescription className="text-neutral-300">
            {content.checkout.errors.configDescription}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={onNavigateHome} className="bg-secondary-700 hover:bg-secondary-600">
            {content.checkout.errors.backToHome}
          </Button>
        </CardFooter>
      </CheckoutCard>
    </PageLayout>
  );
}
