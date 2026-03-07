import { motion } from "framer-motion";

export default function UnderlineReveal({
  text,
  delay = 0,
}: {
  text: string;
  delay?: number;
}) {
  return (
    <span className="relative inline-block mx-1">
      <span className="relative z-10">{text}</span>

      <motion.span
        className="absolute left-0 -bottom-1 h-[2px] w-full bg-[#c9a24d]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{
          delay,
          duration: 0.7,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{ transformOrigin: "left" }}
      />
    </span>
  );
}
