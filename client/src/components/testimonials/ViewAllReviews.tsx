interface ViewAllReviewsProps {
  count: number;
  text: string;
  opinionsText?: string;
}

export default function ViewAllReviews({
  count,
  text,
  opinionsText = "opinii",
}: ViewAllReviewsProps) {
  return (
    <div className="mt-12 text-center">
      <a
        href="#"
        className="inline-flex items-center text-neutral-100 hover:text-secondary-300 transition-colors"
      >
        <span className="mr-2 font-medium">
          {text} {count} {opinionsText}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <path d="M5 12h14"></path>
          <path d="m12 5 7 7-7 7"></path>
        </svg>
      </a>
    </div>
  );
}
