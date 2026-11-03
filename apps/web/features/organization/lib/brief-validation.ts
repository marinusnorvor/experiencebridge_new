import type { Brief } from "../types/portal.ts";

export const briefSteps: (keyof Brief)[][] = [
  ["title", "problem", "audience", "outcome"],
  ["skills", "difficulty", "seats", "hours", "eligibility"],
  ["deliverables", "criteria", "evidence", "exclusions"],
  ["start", "due", "milestonePlan", "mentorPlan", "reviewer"],
  ["fee", "paymentTerms", "ipTerms", "privacyTerms"],
];
/** Checks the existing ProjectCreate/TermsCreate contract, including draft saves. */
export function validateApiBrief(brief: Brief, includeTerms = true): Partial<Record<keyof Brief, string>> {
  const errors: Partial<Record<keyof Brief, string>> = {};
  const lengths: [keyof Brief, number, number][] = [
    ["title", 2, 180], ["problem", 10, 5000], ["deliverables", 10, 5000],
    ["exclusions", 10, 5000], ["milestonePlan", 2, 180],
    ...(includeTerms ? [["mentorPlan", 10, 5000], ["paymentTerms", 10, 5000], ["ipTerms", 10, 5000], ["privacyTerms", 10, 5000]] as [keyof Brief, number, number][] : []),
  ];
  for (const [key, min, max] of lengths) {
    const length = String(brief[key]).trim().length;
    if (length < min || length > max) errors[key] = `Use between ${min} and ${max} characters.`;
  }
  const criteria = brief.criteria.split("\n").map(value => value.trim()).filter(Boolean);
  if (!criteria.length || criteria.length > 20 || criteria.some(value => value.length < 5 || value.length > 1000)) {
    errors.criteria = "Enter 1-20 criteria, one per line, with 5-1,000 characters each.";
  }
  if (!Number.isInteger(brief.seats) || brief.seats < 1 || brief.seats > 100) errors.seats = "Enter a whole number from 1 to 100.";
  const minutes = Math.round(brief.hours * 60);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 100000) errors.hours = "Enter a positive effort of no more than 100,000 minutes.";
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(brief.start)) errors.start = "Choose a valid start date.";
  if (!validDate(brief.due) || brief.due < brief.start) errors.due = "Choose a valid end date on or after the start.";
  if (includeTerms && (!/^\d{1,12}(\.\d{1,2})?$/.test(brief.fee.trim()) || Number(brief.fee) <= 0)) errors.fee = "Enter a positive fee with up to 12 whole digits and two decimal places.";
  return errors;
}

export function validateLiveBrief(brief: Brief, step?: number): Partial<Record<keyof Brief, string>> {
  const apiErrors = validateApiBrief(brief, true);
  if (step === undefined) return apiErrors;
  const stepErrors: Partial<Record<keyof Brief, string>> = {};
  for (const key of briefSteps[step] ?? []) {
    if (apiErrors[key]) stepErrors[key] = apiErrors[key];
  }
  return stepErrors;
}

export function validateBrief(brief: Brief, step?: number) {
  const errors: Partial<Record<keyof Brief, string>> = {};
  for (const key of step === undefined ? briefSteps.flat() : briefSteps[step]) {
    const value = brief[key];
    if (typeof value === "string" && !value.trim()) errors[key] = "Complete this field.";
    if (typeof value === "string" && value.length > 4000) errors[key] = "Use 4,000 characters or fewer.";
  }
  if (step === undefined || step === 0) {
    if (brief.title.trim().length < 5 || brief.title.length > 100) errors.title = "Use a title between 5 and 100 characters.";
  }
  if (step === undefined || step === 1) {
    if (!Number.isInteger(brief.seats) || brief.seats < 1 || brief.seats > 10) errors.seats = "Choose 1–10 places for this demo.";
    if (!Number.isFinite(brief.hours) || brief.hours < 1 || brief.hours > 20) errors.hours = "Enter 1–20 hours per week.";
  }
  if (step === undefined || step === 3) {
    const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!validDate(brief.start)) errors.start = "Choose a valid start date.";
    if (!validDate(brief.due) || brief.due <= brief.start) errors.due = "Choose an end date after the start.";
  }
  if (step === undefined || step === 4) {
    if (!/^\d+(\.\d{1,2})?$/.test(brief.fee) || !Number.isFinite(Number(brief.fee)) || Number(brief.fee) <= 0) errors.fee = "Enter a positive sample fee, with at most two decimal places.";
  }
  const apiErrors = validateApiBrief(brief);
  for (const key of step === undefined ? briefSteps.flat() : briefSteps[step]) {
    if (apiErrors[key]) errors[key] = apiErrors[key];
  }
  return errors;
}

/** Validate browser storage before restoring it; never treat it as trusted data. */
export function parseSavedBrief(raw: string, template: Brief): Brief | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("brief" in parsed)) return null;
    const values = parsed.brief;
    if (!values || typeof values !== "object") return null;
    const result = { ...template };
    for (const key of Object.keys(template) as (keyof Brief)[]) {
      const value = (values as Record<string, unknown>)[key];
      if (typeof value !== typeof template[key] || (typeof value === "string" && value.length > 4000) || (typeof value === "number" && !Number.isFinite(value))) return null;
      Object.assign(result, { [key]: value });
    }
    return result;
  } catch { return null; }
}
