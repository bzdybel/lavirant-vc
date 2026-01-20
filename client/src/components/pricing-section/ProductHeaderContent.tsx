import { ReactNode } from "react";

interface ProductHeaderContentProps {
  children: ReactNode;
  popular: boolean;
}

export default function ProductHeaderContent({
  children,
  popular,
}: ProductHeaderContentProps) {
  return (
    <div
      className={`p-6 border-b border-[#c9a24d]/20 ${
        popular ? "bg-gradient-to-r from-[#c9a24d]/20 to-[#a67c4a]/10" : ""
      }`}
    >
      {children}
    </div>
  );
}
