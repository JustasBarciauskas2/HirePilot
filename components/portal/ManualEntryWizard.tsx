"use client";

import type { JobDetail } from "@/data/jobs";
import type { User } from "firebase/auth";
import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { mergeVacancyDefaults } from "@/lib/merge-vacancy-defaults";
import { VacancyPreviewEditor } from "@/components/portal/VacancyPreviewEditor";

type Props = {
  user: User;
  onBack: () => void;
};

export function ManualEntryWizard({ user, onBack }: Props) {
  const router = useRouter();
  const initialVacancy = useMemo(() => mergeVacancyDefaults({}), []);
  const [publishedJob, setPublishedJob] = useState<JobDetail | null>(null);

  function goBackToChoose() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    onBack();
  }

  useEffect(() => {
    if (publishedJob) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [publishedJob]);

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.08)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={publishedJob ? () => setPublishedJob(null) : goBackToChoose}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-[#7107E7]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {publishedJob ? "Add another" : "Back"}
        </button>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">
          {publishedJob ? "Published" : "Manual entry · 6 sections"}
        </p>
      </div>

      <h2 className="mt-4 font-display text-lg font-semibold text-zinc-950">
        {publishedJob ? "You’re live" : "Add a role yourself"}
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        {publishedJob
          ? "This role is now listed on TechRecruit."
          : "Use the sections below — same layout as after you upload a document. Fill in what you have; you can publish when title and company are set."}
      </p>

      {publishedJob ? (
        <div className="mt-8 rounded-2xl border border-emerald-200/90 bg-emerald-50/80 p-6 text-center">
          <p className="font-medium text-emerald-950">{publishedJob.title}</p>
          <p className="mt-1 font-mono text-xs text-emerald-800">{publishedJob.ref}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/jobs/${publishedJob.slug}`}
              className="inline-flex items-center justify-center rounded-xl bg-[#7107E7] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.35)] transition hover:bg-[#5b06c2]"
            >
              View listing
            </Link>
            <button
              type="button"
              onClick={() => setPublishedJob(null)}
              className="text-sm font-medium text-emerald-900 underline-offset-4 hover:underline"
            >
              Add another role
            </button>
          </div>
        </div>
      ) : (
        <VacancyPreviewEditor
          initialVacancy={initialVacancy}
          user={user}
          onCancel={goBackToChoose}
          onPublished={async (job) => {
            await router.refresh();
            setPublishedJob(job);
          }}
        />
      )}
    </section>
  );
}
