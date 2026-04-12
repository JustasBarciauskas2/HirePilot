"use client";

import { Slider } from "@/components/ui/slider";
import { SALARY_RANGE_STEP_K } from "@/lib/job-salary-range";

type Props = {
  domainMin: number;
  domainMax: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  step?: number;
};

/**
 * Dual-thumb salary window (thousands) via Radix Slider — see [shadcn Slider](https://ui.shadcn.com/docs/components/radix/slider).
 */
export function SalaryRangeSlider({
  domainMin,
  domainMax,
  valueMin,
  valueMax,
  onChange,
  step = SALARY_RANGE_STEP_K,
}: Props) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Annual base</p>
      <p className="text-center font-mono text-base font-semibold tabular-nums text-zinc-900 sm:text-lg">
        <span>{valueMin}k</span>
        <span className="mx-2 font-normal text-zinc-300">/</span>
        <span>{valueMax}k</span>
      </p>

      <Slider
        className="w-full py-1"
        dir="ltr"
        min={domainMin}
        max={domainMax}
        step={step}
        minStepsBetweenThumbs={1}
        value={[valueMin, valueMax]}
        onValueChange={(v) => {
          const [lo, hi] = v;
          if (lo !== undefined && hi !== undefined) {
            onChange(lo, hi);
          }
        }}
        aria-label="Annual base salary range in thousands"
      />

      <div className="flex justify-between font-mono text-[11px] tabular-nums text-zinc-500">
        <span>{domainMin}k</span>
        <span>{domainMax}k+</span>
      </div>
    </div>
  );
}
