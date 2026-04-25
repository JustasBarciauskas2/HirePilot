"use client";

import type { JobDetail } from "@techrecruit/shared/data/jobs";
import type { VacancyNormalizedFromDocument } from "@techrecruit/shared/data/vacancy-normalized-from-document";
import type { User } from "firebase/auth";
import { ArrowLeft, CheckCircle, FileText, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import { portalAuthHeaders } from "@techrecruit/shared/lib/portal-auth";
import { publicJobPageHttpHrefForPortalTenant } from "@techrecruit/shared/lib/portal-tenant";
import { parseVacancyFromUnknown } from "@techrecruit/shared/lib/parse-vacancy-envelope";
import { VacancyPreviewEditor } from "@/components/portal/VacancyPreviewEditor";

type Props = {
  user: User;
  tenantId: string;
  onBack: () => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentProcessingOverlay({ fileName }: { fileName: string }) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-busy="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-white/88 px-6 py-10 shadow-[inset_0_0_0_1px_rgba(113,7,231,0.08)] backdrop-blur-md"
    >
      <div className="relative mx-auto h-32 w-28 overflow-hidden rounded-2xl bg-gradient-to-b from-white via-zinc-50/95 to-zinc-100/90 shadow-[0_12px_40px_-12px_rgba(113,7,231,0.25)] ring-1 ring-zinc-200/90">
        <motion.div
          className="pointer-events-none absolute inset-0 h-full w-[45%] bg-gradient-to-r from-transparent via-[#7107E7]/20 to-transparent blur-[2px]"
          initial={{ x: "-100%" }}
          animate={{ x: "280%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <FileText className="h-14 w-14 text-[#7107E7]" weight="duotone" aria-hidden />
        </motion.div>
      </div>

      <p className="mt-6 text-center font-display text-base font-semibold tracking-tight text-zinc-900">
        Working on your file
      </p>
      <p className="mt-1 max-w-[220px] text-center text-xs leading-relaxed text-zinc-500">
        Reading the document and pulling out the role details.
      </p>
      <p className="mt-3 max-w-full truncate text-center font-mono text-[11px] text-zinc-400" title={fileName}>
        {fileName}
      </p>

      <div className="mt-5 flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-[#7107E7]"
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.05, 0.85] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function FileUploadWizard({ user, tenantId, onBack }: Props) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileDrag, setFileDrag] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  /** 1 = upload, 2 = review or raw response, 3 = published */
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{
    ok: boolean;
    backendStatus: number;
    backend: unknown;
  } | null>(null);
  const [parsedVacancy, setParsedVacancy] = useState<VacancyNormalizedFromDocument | null>(null);
  const [parseFailed, setParseFailed] = useState(false);
  const [publishedJob, setPublishedJob] = useState<JobDetail | null>(null);

  useEffect(() => {
    if (step === 3 && publishedJob) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step, publishedJob]);

  function syncFileFromInput() {
    const f = fileInputRef.current?.files?.[0];
    setSelectedFile(f && f.size > 0 ? f : null);
  }

  function clearFile() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSelectedFile(null);
    setErr(null);
  }

  function resetFlow() {
    setStep(1);
    setResult(null);
    setErr(null);
    setParsedVacancy(null);
    setParseFailed(false);
    setPublishedJob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSelectedFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** After publish, return to the portal “New listing” choice (Upload / Enter manually), not upload step 1. */
  function exitToListingChoice() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    onBack();
  }

  async function uploadDocument() {
    const input = fileInputRef.current;
    const f = input?.files?.[0];
    if (!f || f.size === 0) {
      setErr("Choose a file first.");
      return;
    }
    setErr(null);
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("file", f, f.name);
      const headers = await portalAuthHeaders(user);
      const res = await fetch("/api/portal/job-document", {
        method: "POST",
        body: fd,
        headers: { ...headers },
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        backendStatus?: number;
        backend?: unknown;
      };
      if (!res.ok && typeof data.error === "string") {
        setErr(data.error);
        return;
      }
      const wrapped = {
        ok: Boolean(data.ok),
        backendStatus: typeof data.backendStatus === "number" ? data.backendStatus : res.status,
        backend: data.backend,
      };
      setResult(wrapped);

      const parsed = parseVacancyFromUnknown(data.backend);
      if (parsed) {
        setParsedVacancy(parsed);
        setParseFailed(false);
      } else {
        setParsedVacancy(null);
        setParseFailed(true);
      }
      setStep(2);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setPending(false);
    }
  }

  const stepLabel =
    step === 1 ? "Upload" : step === 2 ? (parsedVacancy ? "Review" : "Check") : "Done";

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.08)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={
            step === 3
              ? exitToListingChoice
              : step === 2
                ? resetFlow
                : () => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    onBack();
                  }
          }
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-[#7107E7]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {step === 1 ? "Back" : step === 3 ? "Upload another" : "Start over"}
        </button>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">
          From file · Step {step} of 3 · {stepLabel}
        </p>
      </div>

      <h2 className="mt-4 font-display text-lg font-semibold text-zinc-950">
        {step === 1 && "Start from a document"}
        {step === 2 && parsedVacancy && "Check the details"}
        {step === 2 && !parsedVacancy && "We couldn’t read this file"}
        {step === 3 && "You’re live"}
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        {step === 1 &&
          "Upload a Word, PDF, or text file with the job description. We’ll fill in what we can so you can review it before it goes live."}
        {step === 2 &&
          parsedVacancy &&
          "Change anything below, then publish. Your listing will show on this site and anywhere else your company has connected it."}
        {step === 2 &&
          !parsedVacancy &&
          "We couldn’t pull out the job details from that file. Try another file, go back and start over, or add the role manually instead."}
        {step === 3 && "This role is now listed on TechRecruit."}
      </p>

      {err ? (
        <p className="mt-4 rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800" role="alert">
          {err}
        </p>
      ) : null}

      {step === 1 ? (
        <div className={`relative mt-8 ${pending ? "min-h-[260px]" : ""}`}>
          <AnimatePresence mode="wait">
            {pending && selectedFile ? (
              <DocumentProcessingOverlay key="processing" fileName={selectedFile.name} />
            ) : null}
          </AnimatePresence>

          <div
            className={`space-y-4 transition-opacity duration-300 ${pending ? "pointer-events-none opacity-[0.22]" : "opacity-100"}`}
            aria-hidden={pending}
          >
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            name="file"
            accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={() => syncFileFromInput()}
          />
          <div className="space-y-3">
            <label
              htmlFor={fileInputId}
              onDragOver={(e) => {
                e.preventDefault();
                setFileDrag(true);
              }}
              onDragLeave={() => setFileDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setFileDrag(false);
                const dropped = e.dataTransfer.files[0];
                const input = fileInputRef.current;
                if (dropped && input) {
                  const dt = new DataTransfer();
                  dt.items.add(dropped);
                  input.files = dt.files;
                  syncFileFromInput();
                }
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 px-6 py-10 text-center transition ${
                selectedFile
                  ? "border border-emerald-200/90 bg-gradient-to-b from-emerald-50/95 to-white shadow-[0_20px_50px_-24px_rgba(16,185,129,0.35)]"
                  : fileDrag
                    ? "border-dashed border-[#7107E7]/60 bg-[#7107E7]/[0.08] shadow-[0_20px_50px_-24px_rgba(113,7,231,0.2)]"
                    : "border-dashed border-zinc-200/95 bg-gradient-to-b from-zinc-50/80 to-white hover:border-[#7107E7]/45 hover:shadow-[0_20px_50px_-24px_rgba(113,7,231,0.12)]"
              }`}
            >
              {selectedFile ? (
                <>
                  <div className="relative mb-5 flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-emerald-100/90 to-emerald-50 shadow-[0_12px_28px_-12px_rgba(16,185,129,0.45)] ring-1 ring-emerald-200/70">
                    <FileText className="h-[2.85rem] w-[2.85rem] text-emerald-800" weight="duotone" aria-hidden />
                    <span className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md ring-2 ring-white">
                      <CheckCircle className="h-4 w-4" weight="fill" aria-hidden />
                    </span>
                  </div>
                  <p className="text-sm font-semibold tracking-tight text-emerald-900">Document added</p>
                  <p
                    className="mt-2 max-w-full truncate px-2 font-mono text-xs font-medium text-zinc-800 sm:text-sm"
                    title={selectedFile.name}
                  >
                    {selectedFile.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{formatFileSize(selectedFile.size)}</p>
                  <p className="mt-4 text-xs text-zinc-400">Click or drop to replace</p>
                </>
              ) : (
                <>
                  <div className="mb-5 flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-white to-zinc-50/90 shadow-[0_12px_32px_-14px_rgba(24,24,27,0.12)] ring-1 ring-zinc-200/80">
                    <FileText className="h-[2.85rem] w-[2.85rem] text-[#7107E7]" weight="duotone" aria-hidden />
                  </div>
                  <span className="font-medium text-zinc-900">Drop a file or click to browse</span>
                  <span className="mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">
                    Text, Markdown, PDF, or Word (.docx) · max 5MB
                  </span>
                </>
              )}
            </label>
            {selectedFile ? (
              <>
                <p className="sr-only" role="status">
                  Selected file {selectedFile.name}, {formatFileSize(selectedFile.size)}
                </p>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={clearFile}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-800"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                    Remove file
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={pending || !selectedFile}
              onClick={() => void uploadDocument()}
              className="inline-flex items-center justify-center rounded-xl bg-[#7107E7] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.4)] transition hover:bg-[#5b06c2] disabled:opacity-50"
            >
              {pending ? "Processing…" : "Upload document"}
            </button>
          </div>
          </div>
        </div>
      ) : null}

      {step === 2 && result ? (
        <>
          <div
            className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${
              result.ok ? "border-emerald-200/90 bg-emerald-50/80" : "border-amber-200/90 bg-amber-50/80"
            }`}
          >
            <CheckCircle
              className={`mt-0.5 h-5 w-5 shrink-0 ${result.ok ? "text-emerald-600" : "text-amber-600"}`}
              weight="duotone"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {result.ok ? "File received" : "Something went wrong"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">
                {parseFailed
                  ? "We couldn’t read the job details — see the technical section below if you need to share this with IT."
                  : "Review the sections below and change anything you need."}
              </p>
            </div>
          </div>

          {parsedVacancy ? (
            <VacancyPreviewEditor
              initialVacancy={parsedVacancy}
              user={user}
              tenantId={tenantId}
              onCancel={resetFlow}
              onPublished={(job) => {
                setPublishedJob(job);
                setStep(3);
              }}
            />
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-400">Technical details</p>
                <pre className="mt-2 max-h-[min(360px,50vh)] overflow-auto rounded-lg bg-white p-3 font-mono text-xs leading-relaxed text-zinc-800">
                  {result.backend === undefined || result.backend === null
                    ? "(empty)"
                    : typeof result.backend === "string"
                      ? result.backend
                      : JSON.stringify(result.backend, null, 2)}
                </pre>
              </div>
              <p className="text-sm text-zinc-600">
                If this keeps happening, send this screen to your IT or support team so they can check the connection.
              </p>
            </div>
          )}
        </>
      ) : null}

      {step === 3 && publishedJob ? (
        (() => {
          const viewHref = publicJobPageHttpHrefForPortalTenant(tenantId, publishedJob.slug);
          return (
            <div className="mt-8 rounded-2xl border border-emerald-200/90 bg-emerald-50/80 p-6 text-center">
              <p className="font-medium text-emerald-950">{publishedJob.title}</p>
              <p className="mt-1 font-mono text-xs text-emerald-800">{publishedJob.ref}</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {viewHref ? (
                  <a
                    href={viewHref}
                    className="inline-flex items-center justify-center rounded-xl bg-[#7107E7] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.35)] transition hover:bg-[#5b06c2]"
                  >
                    View vacancy
                  </a>
                ) : (
                  <span
                    className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-zinc-300 px-5 py-2.5 text-sm font-semibold text-white"
                    title="Set NEXT_PUBLIC_MARKETING_SITE_URL on the portal, or for local dev NEXT_PUBLIC_PORTAL_URL (e.g. http://localhost:3001) to infer the marketing site."
                  >
                    View vacancy
                  </span>
                )}
                <button
                  type="button"
                  onClick={exitToListingChoice}
                  className="text-sm font-medium text-emerald-900 underline-offset-4 hover:underline"
                >
                  Upload another document
                </button>
              </div>
            </div>
          );
        })()
      ) : null}
    </section>
  );
}
