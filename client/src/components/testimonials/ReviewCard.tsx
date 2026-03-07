import { motion } from "framer-motion";
import StarRating from "./StarRating";

interface ReviewCardProps {
  name: string;
  title: string;
  avatar: string;
  rating: number;
  comment: string;
  index: number;
}

export default function ReviewCard({
  name,
  title,
  avatar,
  rating,
  comment,
  index,
}: ReviewCardProps) {
  return (
    <motion.div
      className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white border-opacity-20"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center mb-4">
        <img
          src={avatar}
          alt={name}
          className="w-12 h-12 rounded-full mr-3"
        />
        <div>
          <h3 className="font-bold text-lg">{name}</h3>
          <p className="text-neutral-200 text-sm">{title}</p>
        </div>
      </div>

      <StarRating rating={rating} />

      <p className="italic text-neutral-100">&quot;{comment}&quot;</p>
    </motion.div>
  );
}
