"use client";

import { motion } from "framer-motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px", amount: 0.2 }}
      transition={{
        type: "spring",
        stiffness: 90,
        damping: 22,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
