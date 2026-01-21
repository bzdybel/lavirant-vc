import { Card } from "@/components/ui/card";

interface CheckoutCardProps {
  children: React.ReactNode;
}

export default function CheckoutCard({ children }: CheckoutCardProps) {
  return (
    <Card className="border-white/10 shadow-xl bg-[#132b3d]/90 backdrop-blur-sm text-white">
      {children}
    </Card>
  );
}
