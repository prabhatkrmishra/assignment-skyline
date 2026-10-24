/**
 * @fileoverview Shared enquiry validation without runtime schema dependencies.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Constants and predicates used by both the browser form and the server Zod
 * schema, so validation rules cannot drift while zod stays out of client JS.
 *
 * @scope
 * - Enquiry request validation.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module enquiry/validation
 */
import { getTodayInIndia, isCalendarDate } from "@/lib/properties/date";

export const ENQUIRY_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  emailMax: 160,
  messageMin: 10,
  messageMax: 1_000,
  slugMax: 160,
  websiteMax: 200,
} as const;

const INDIAN_MOBILE = /^[6-9]\d{9}$/;
// Practical email shape used by Zod's email validator, kept here so both sides share one rule.
const EMAIL = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

/** Returns true for a 10-digit Indian mobile number starting 6-9. */
export function isIndianMobile(value: string): boolean {
  return INDIAN_MOBILE.test(value);
}

/** Returns true for a single-address email with a dot-separated domain. */
export function isEnquiryEmail(value: string): boolean {
  return value.length <= ENQUIRY_LIMITS.emailMax && EMAIL.test(value);
}
const MESSAGES = {
  name: "Enter your full name",
  nameLong: `Name must be ${ENQUIRY_LIMITS.nameMax} characters or fewer`,
  phone: "Enter a valid 10-digit Indian mobile number",
  email: "Enter a valid email address",
  emailLong: `Email must be ${ENQUIRY_LIMITS.emailMax} characters or fewer`,
  message: `Please share at least ${ENQUIRY_LIMITS.messageMin} characters`,
  messageLong: `Message must be ${ENQUIRY_LIMITS.messageMax.toLocaleString("en-IN")} characters or fewer`,
  date: "Choose a valid calendar date in YYYY-MM-DD format",
  datePast: "Choose today or a future date",
  slug: "The selected property is invalid",
  website: "Leave this field empty",
} as const;

/** Raw form values before validation. */
export interface EnquiryValues {
  propertySlug: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  preferredVisitDate: string;
  website: string;
}

/** Values accepted by the API (email omitted when blank). */
export type EnquiryData = Omit<EnquiryValues, "email"> & { email?: string };

/** Field-level validation messages keyed by form field. */
export type EnquiryFieldErrors = Partial<Record<keyof EnquiryValues, string>>;

export type EnquiryValidation =
  | { ok: true; data: EnquiryData }
  | { ok: false; fieldErrors: EnquiryFieldErrors };

/** Validates and normalizes an enquiry, mirroring the server schema. */
export function validateEnquiry(input: EnquiryValues): EnquiryValidation {
  const fieldErrors: EnquiryFieldErrors = {};

  const propertySlug = input.propertySlug.trim();
  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  if (!propertySlug || propertySlug.length > ENQUIRY_LIMITS.slugMax) fieldErrors.propertySlug = MESSAGES.slug;
  if (name.length < ENQUIRY_LIMITS.nameMin) fieldErrors.name = MESSAGES.name;
  else if (name.length > ENQUIRY_LIMITS.nameMax) fieldErrors.name = MESSAGES.nameLong;
  if (!isIndianMobile(phone)) fieldErrors.phone = MESSAGES.phone;
  if (email) {
    if (!isEnquiryEmail(email)) fieldErrors.email = email.length > ENQUIRY_LIMITS.emailMax ? MESSAGES.emailLong : MESSAGES.email;
  }
  if (message.length < ENQUIRY_LIMITS.messageMin) fieldErrors.message = MESSAGES.message;
  else if (message.length > ENQUIRY_LIMITS.messageMax) fieldErrors.message = MESSAGES.messageLong;
  if (!isCalendarDate(input.preferredVisitDate)) fieldErrors.preferredVisitDate = MESSAGES.date;
  else if (input.preferredVisitDate < getTodayInIndia()) fieldErrors.preferredVisitDate = MESSAGES.datePast;
  if (input.website.length > ENQUIRY_LIMITS.websiteMax) fieldErrors.website = MESSAGES.website;

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  return {
    ok: true,
    data: {
      propertySlug,
      name,
      phone,
      email: email || undefined,
      message,
      preferredVisitDate: input.preferredVisitDate,
      website: input.website,
    },
  };
}
