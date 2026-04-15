"use client";

const roles = [
  "We place engineers",
  "Product & design",
  "Data & ML",
  "Remote & hybrid",
  "Salary clarity upfront",
  "Interview prep",
  "Offer support",
  "Your next move",
];

export function MarqueeRoles() {
  const doubled = [...roles, ...roles];
  return (
    <div className="relative z-10 overflow-hidden border-b border-[#7107E7]/15 bg-gradient-to-r from-zinc-100/50 via-[#7107E7]/[0.04] to-zinc-100/50 py-5">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap px-4">
        {doubled.map((r, i) => (
          <span
            key={`${r}-${i}`}
            className={`font-mono text-xs font-medium uppercase tracking-[0.14em] ${
              i % 3 === 0 ? "text-[#7107E7]" : "text-zinc-500"
            }`}
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}
