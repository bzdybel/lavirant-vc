import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
}

export default function StarRating({ rating }: StarRatingProps) {
  return (
    <div className="mb-4 text-secondary-300 flex">
      {Array(5)
        .fill(0)
        .map((_, i) => (
          <Star
            key={i}
            className={`h-5 w-5 ${i < rating ? "fill-current" : ""}`}
          />
        ))}
    </div>
  );
}
