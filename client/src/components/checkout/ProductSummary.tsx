interface ProductSummaryProps {
  name: string;
  price: number;
  image: string;
}

export default function ProductSummary({ name, price, image }: ProductSummaryProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 mb-8">
      <div className="flex gap-6 items-center">
        <div className="h-64 w-64 flex-shrink-0 overflow-hidden rounded-lg border border-white/20">
          <img src={image} alt={name} className="h-full w-full object-cover object-center" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">{name}</h3>
          <p className="text-lg text-neutral-300">{price.toFixed(2)} zł</p>
        </div>
      </div>
    </div>
  );
}
