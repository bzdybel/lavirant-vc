import { useContent } from "../hooks/useContent";
import SectionHeader from "./shared/SectionHeader";
import ReviewCard from "./testimonials/ReviewCard";
import ViewAllReviews from "./testimonials/ViewAllReviews";

export default function Testimonials() {
  const content = useContent();
  const testimonials = content?.testimonials;

  if (!testimonials?.reviews || testimonials.reviews.length === 0) {
    return null;
  }

  return (
    <section
      id="reviews"
      className="py-16 md:py-24 bg-gradient-to-br from-primary-900 to-accent-700 text-white"
    >
      <div className="container mx-auto px-4">
        <SectionHeader
          title={testimonials.title}
          subtitle={testimonials.subtitle}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.reviews.map((review, index) => (
            <ReviewCard
              key={review.id}
              name={review.name}
              title={review.title}
              avatar={review.avatar}
              rating={review.rating}
              comment={review.comment}
              index={index}
            />
          ))}
        </div>

        <ViewAllReviews
          count={testimonials.reviewCount}
          text={testimonials.viewAllText}
          opinionsText={testimonials.viewAllOpinions}
        />
      </div>
    </section>
  );
}
