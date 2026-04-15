"use client";

import type { JobDetail } from "@techrecruit/shared/data/jobs";
import { Copy, EnvelopeSimple, LinkedinLogo, ShareNetwork } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

function buildShareMessage(title: string, url: string): string {
  return `${title}\n\n${url}`;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function buildMailto(url: string, title: string): string {
  return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(buildShareMessage(title, url))}`;
}

/** LinkedIn no longer honors shareArticle / summary params; opens feed composer with suggested text + copies for paste fallback. */
function linkedInFeedShareUrl(prefillText: string): string {
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(prefillText)}`;
}

export function JobShareBlock({ job }: { job: JobDetail }) {
  const pathname = usePathname();
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [linkedInHint, setLinkedInHint] = useState(false);

  const title = `${job.title} · ${job.companyName}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShareUrl(`${window.location.origin}${pathname}`);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) setCopied(true);
  }, [shareUrl]);

  const openLinkedIn = useCallback(async () => {
    if (!shareUrl) return;
    const message = buildShareMessage(title, shareUrl);
    await copyTextToClipboard(message);
    window.open(linkedInFeedShareUrl(message), "_blank", "noopener,noreferrer");
    setLinkedInHint(true);
    window.setTimeout(() => setLinkedInHint(false), 6000);
  }, [shareUrl, title]);

  const mailtoHref = shareUrl ? buildMailto(shareUrl, title) : null;

  return (
    <div
      ref={wrapRef}
      className="mx-auto max-w-sm overflow-hidden rounded-lg border border-zinc-200/90 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.03)]"
    >
      <button
        type="button"
        id={`${menuId}-trigger`}
        aria-expanded={open}
        aria-controls={`${menuId}-menu`}
        aria-haspopup="true"
        disabled={!shareUrl}
        onClick={() => shareUrl && setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-2 px-3 py-2 text-left transition hover:bg-zinc-50/80 enabled:cursor-pointer disabled:cursor-wait disabled:opacity-60"
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-zinc-500" aria-hidden>
          <ShareNetwork className="h-4 w-4" weight="duotone" />
        </span>
        <span className="text-xs font-medium leading-snug text-zinc-800 underline decoration-zinc-300 underline-offset-[3px]">
          Share this job
        </span>
      </button>

      {open && mailtoHref ? (
        <div
          id={`${menuId}-menu`}
          role="region"
          aria-label="Share options"
          className="border-t border-zinc-100 bg-zinc-50/50 px-2 py-2"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-2 transition hover:bg-white hover:decoration-zinc-500"
            >
              <Copy className="h-3.5 w-3.5 shrink-0 text-zinc-500" weight="duotone" aria-hidden />
              {copied ? "Copied" : "Copy link"}
            </button>
            <span className="text-zinc-300" aria-hidden>
              ·
            </span>
            <button
              type="button"
              onClick={() => void openLinkedIn()}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-2 transition hover:bg-white hover:decoration-zinc-500"
            >
              <LinkedinLogo className="h-3.5 w-3.5 shrink-0 text-zinc-500" weight="duotone" aria-hidden />
              LinkedIn
            </button>
            <span className="text-zinc-300" aria-hidden>
              ·
            </span>
            <a
              href={mailtoHref}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-2 transition hover:bg-white hover:decoration-zinc-500"
            >
              <EnvelopeSimple className="h-3.5 w-3.5 shrink-0 text-zinc-500" weight="duotone" aria-hidden />
              Email
            </a>
          </div>
          {linkedInHint ? (
            <p
              className="mt-1.5 text-center text-[11px] leading-snug text-zinc-500"
              role="status"
              aria-live="polite"
            >
              Message copied — paste (⌘V) if the post is empty.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
