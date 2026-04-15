/** Currency for structured annual pay in the portal (thousands). */
export type PayCurrency = "USD" | "GBP" | "EUR";

export const PAY_CURRENCY_OPTIONS: { value: PayCurrency; label: string }[] = [
  { value: "USD", label: "USD ($)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "EUR", label: "EUR (€)" },
];

const SYMBOL: Record<PayCurrency, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
};

export function inferPayCurrencyFromText(text: string): PayCurrency {
  if (/£/.test(text)) return "GBP";
  if (/€/.test(text)) return "EUR";
  return "USD";
}

/**
 * Build listing strings like `$80k–$100k` (amounts are in **thousands**).
 */
export function buildCompFromRangeK(
  minK: number,
  maxK: number,
  currency: PayCurrency,
): { comp: string; salaryHighlight: string } {
  const sym = SYMBOL[currency];
  const lo = Math.min(minK, maxK);
  const hi = Math.max(minK, maxK);
  if (lo === hi) {
    const line = `${sym}${lo}k`;
    return { comp: line, salaryHighlight: line };
  }
  const line = `${sym}${lo}k–${sym}${hi}k`;
  return { comp: line, salaryHighlight: line };
}

/** Display strings plus canonical numeric band in thousands (for storage and filters). */
export function structuredSalaryFromRangeK(
  minK: number,
  maxK: number,
  currency: PayCurrency,
): {
  comp: string;
  salaryHighlight: string;
  salaryMinK: number;
  salaryMaxK: number;
  compensationCurrency: PayCurrency;
} {
  const lo = Math.min(minK, maxK);
  const hi = Math.max(minK, maxK);
  const { comp, salaryHighlight } = buildCompFromRangeK(lo, hi, currency);
  return { comp, salaryHighlight, salaryMinK: lo, salaryMaxK: hi, compensationCurrency: currency };
}

/**
 * Allow only digits and at most one `.` — blocks letters and symbols while typing or pasting.
 */
export function sanitizeSalaryKDigits(raw: string): string {
  let out = "";
  let sawDot = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !sawDot) {
      sawDot = true;
      out += ".";
    }
  }
  return out;
}

/**
 * Parse a single field: `80`, `80k`, `80000` → thousands (80).
 */
export function parseSalaryKInput(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "").toLowerCase();
  if (!t) return null;
  const m = t.match(/^(\d+(?:\.\d+)?)\s*k?$/);
  if (m) {
    const v = parseFloat(m[1]);
    return Number.isFinite(v) ? v : null;
  }
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return null;
  const k = n >= 1000 ? n / 1000 : n;
  return Number.isFinite(k) ? k : null;
}
