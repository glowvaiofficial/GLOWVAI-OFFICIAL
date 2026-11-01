// Department mailboxes. Each address must exist (or forward) on the glowvai.in mail host before launch.
export const departmentEmails = [
  { key: "contact", label: "General enquiries", email: "contact@glowvai.in", for: "Anything not listed below" },
  { key: "support", label: "Orders and delivery", email: "support@glowvai.in", for: "Order status, missing items, delivery problems" },
  { key: "returns", label: "Returns and refunds", email: "returns@glowvai.in", for: "Return requests, refund status" },
  { key: "partners", label: "Partners and brands", email: "partners@glowvai.in", for: "Partner stores, brands, suppliers, riders" },
  { key: "careers", label: "Careers", email: "careers@glowvai.in", for: "Jobs and internships" },
  { key: "press", label: "Press and media", email: "press@glowvai.in", for: "Interviews, media kit, quotes" },
  { key: "privacy", label: "Privacy and data", email: "privacy@glowvai.in", for: "Access or delete your data" },
  { key: "grievance", label: "Grievance officer", email: "grievance@glowvai.in", for: "Complaints under the e-commerce rules" },
] as const;

export const emailFor = (key: (typeof departmentEmails)[number]["key"]) =>
  departmentEmails.find((d) => d.key === key)!.email;
