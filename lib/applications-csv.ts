import { JOB_APPLICATION_STATUS_LABELS, type JobApplicationRecord } from "@/lib/job-application-shared";

function csvEscapeCell(value: string): string {
  const s = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** User’s local timezone & locale (runs in the browser when exporting). */
function formatSubmittedForUser(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

const HEADERS = [
  "Submitted",
  "Status",
  "First name",
  "Last name",
  "Email",
  "Phone",
  "Job ref",
  "Job slug",
  "Job title",
  "Company",
  "CV file name",
  "Backend person ID",
] as const;

/** Build a UTF-8 CSV string for spreadsheet apps (includes BOM for Excel). */
export function buildApplicationsCsv(rows: JobApplicationRecord[]): string {
  const lines: string[] = [];
  lines.push(HEADERS.map((h) => csvEscapeCell(h)).join(","));

  for (const r of rows) {
    const cells = [
      formatSubmittedForUser(r.createdAt),
      JOB_APPLICATION_STATUS_LABELS[r.status] ?? r.status,
      r.firstName,
      r.lastName,
      r.email,
      r.phone,
      r.jobRef,
      r.jobSlug,
      r.jobTitle,
      r.companyName,
      r.cvFileName,
      r.backendPersonId ?? "",
    ];
    lines.push(cells.map((c) => csvEscapeCell(String(c))).join(","));
  }

  return `\uFEFF${lines.join("\r\n")}`;
}

export function triggerCsvDownload(csv: string, filenameBase: string): void {
  const safe = filenameBase.replace(/[^\w\-]+/g, "_").slice(0, 80) || "applications";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}.csv`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
