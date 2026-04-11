import type { JobDetail } from "@/data/job-types";
import type { Icon } from "@phosphor-icons/react";
import { CoinVertical, CurrencyDollar, CurrencyEur, CurrencyGbp } from "@phosphor-icons/react";

function pickIconFromStrings(text: string, currency?: string): Icon {
  const c = currency?.trim().toUpperCase();
  if (c === "GBP") return CurrencyGbp;
  if (c === "EUR") return CurrencyEur;
  if (c === "USD") return CurrencyDollar;
  if (text.includes("£")) return CurrencyGbp;
  if (text.includes("€")) return CurrencyEur;
  if (text.includes("$")) return CurrencyDollar;
  return CoinVertical;
}

function pickIconForSalary(job: JobDetail): Icon {
  return pickIconFromStrings(job.salaryHighlight || "", job.compensationCurrency);
}

/**
 * Icon next to a comp pill.
 * - `salary` (default): currency-specific when `£`/`$`/`€` or `compensationCurrency` is set, else coins.
 * - `equity`: always generic coins — equity can be any currency or structure.
 */
export function CompensationPillIcon({
  job,
  text,
  currencyOverride,
  variant = "salary",
  className,
}: {
  job?: JobDetail;
  text?: string;
  currencyOverride?: string;
  variant?: "salary" | "equity";
  className?: string;
}) {
  const Icon: Icon =
    variant === "equity"
      ? CoinVertical
      : job
        ? pickIconForSalary(job)
        : pickIconFromStrings(text ?? "", currencyOverride);
  return (
    <span className="inline-flex shrink-0 items-center justify-center leading-none [&>svg]:block" aria-hidden>
      <Icon className={className} weight="duotone" />
    </span>
  );
}
