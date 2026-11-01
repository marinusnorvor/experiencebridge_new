import type { DemoProfile } from "../types/portal";
export function validateProfile(profile: DemoProfile) {
  const errors: Partial<Record<keyof DemoProfile, string>> = {};
  if (profile.name.trim().length < 5 || profile.name.length > 100) errors.name = "Use 5–100 characters.";
  if (!profile.name.startsWith("DEMO ")) errors.name = "Keep the DEMO prefix so the organization remains clearly synthetic.";
  if (profile.description.trim().length < 20 || profile.description.length > 1000) errors.description = "Describe the sample organization in 20–1,000 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) || profile.email.length > 200) errors.email = "Enter a valid sample email address.";
  if (!profile.country.trim() || profile.country.length > 80) errors.country = "Enter a country (80 characters or fewer).";
  if (!profile.representative.trim() || profile.representative.length > 100) errors.representative = "Enter a sample representative (100 characters or fewer).";
  if (profile.website) { try { const url = new URL(profile.website); if (url.protocol !== "https:" || url.username || url.password || profile.website.length > 500) throw new Error(); } catch { errors.website = "Use an HTTPS address without credentials, or leave blank."; } }
  return errors;
}
