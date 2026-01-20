import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface ProductFooterProps {
  popular: boolean;
  button: string;
}

export default function ProductFooter({
  popular,
  button,
}: ProductFooterProps) {
  return (
    <Link href="/checkout">
      <Button
        className={`w-full mt-8 font-bold py-3 rounded-lg transition-all ${
          popular
            ? "bg-[#c9a24d] hover:bg-[#a67c4a] text-[#0f2433]"
            : "bg-[#c9a24d]/20 hover:bg-[#c9a24d]/30 text-white border border-[#c9a24d]/50"
        }`}
      >
        {button}
      </Button>
    </Link>
  );
}
