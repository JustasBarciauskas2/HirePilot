"use client";

import { motion } from "framer-motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

/** Scales stagger props (~0.6×) so lists feel snappier without editing every call site */
const DELAY_SCALE = 0.55;

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const scaledDelay = delay * DELAY_SCALE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-48px", amount: 0.15 }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 32,
        mass: 0.85,
        delay: scaledDelay,
      }}
      className={className ? `${className} pointer-events-auto` : "pointer-events-auto"}
    >
      {children}
    </motion.div>
  );
}
