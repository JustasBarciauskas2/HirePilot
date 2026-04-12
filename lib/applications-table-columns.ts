/**
 * Logical column indices for the portal applications table (stable ids for widths + order).
 * 0 Received, 1 Candidate, 2 Contact, 3 Vacancy, 4 Status, 5 CV
 */
export const APPLICATIONS_TABLE_COLUMNS = [
  {
    label: "Received",
    title: "When the candidate submitted the application.",
  },
  {
    label: "Candidate",
    title: "Name from the application form.",
  },
  {
    label: "Contact",
    title: "Email and phone from the application.",
  },
  {
    label: "Vacancy",
    title: "Job ref, title, and company. Title links to the public job page.",
  },
  {
    label: "Status",
    title: "Recruiting pipeline status for this application.",
  },
  {
    label: "CV",
    title: "Download the uploaded CV (Firebase Storage).",
  },
] as const;
