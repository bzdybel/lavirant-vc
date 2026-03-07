import { motion } from "framer-motion";

export default function WordReveal({
  text,
  delay = 0,
}: {
  text: string;
  delay?: number;
}) {
  return (
    <span
      className="relative inline-block mx-1 overflow-hidden align-baseline"
      style={{ lineHeight: "1em" }}
    >
      <motion.span
        className="inline-block text-[#c9a24d]"
        initial={{ y: 24, opacity: 0, filter: "blur(6px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{
          delay,
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {text}
      </motion.span>
    </span>
  );
}
