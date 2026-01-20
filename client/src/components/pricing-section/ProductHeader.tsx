import ProductHeaderContent from "./ProductHeaderContent";

interface ProductHeaderProps {
  name: string;
  tagline: string;
  price: number;
  popular: boolean;
  badge: string;
}

export default function ProductHeader({
  name,
  tagline,
  price,
  popular,
  badge,
}: ProductHeaderProps) {
  return (
    <ProductHeaderContent popular={popular}>
      {popular && (
        <div className="bg-[#c9a24d] text-[#0f2433] text-xs font-bold uppercase py-1 px-3 rounded-full inline-block mb-2">
          {badge}
        </div>
      )}
      <h3 className="font-playfair text-2xl font-bold mb-1 text-white">
        {name}
      </h3>
      {tagline && <p className="text-white/70 mb-4">{tagline}</p>}
      <div className="flex items-end">
        <span className="text-4xl font-bold text-[#c9a24d]">{price} zł</span>
      </div>
    </ProductHeaderContent>
  );
}
