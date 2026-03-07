import { CardContent } from "@/components/ui/card";
import PageLayout from "./PageLayout";
import CheckoutCard from "./CheckoutCard";
import content from "@/lib/content.json";

export default function LoadingState() {
  return (
    <PageLayout>
      <CheckoutCard>
        <CardContent className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary-600 border-t-transparent"></div>
          <span className="ml-3 text-white">{content.checkout.loading}</span>
        </CardContent>
      </CheckoutCard>
    </PageLayout>
  );
}
