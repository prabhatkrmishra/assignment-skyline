"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { enquirySchema } from "@/lib/properties/types";

type EnquiryFields = {
  name: string;
  phone: string;
  email: string;
  message: string;
  preferredVisitDate: string;
  website: string;
};
type FieldErrors = Partial<Record<keyof EnquiryFields | "propertySlug", string>>;

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function EnquiryForm({ propertySlug, propertyTitle }: { propertySlug: string; propertyTitle: string }) {
  const today = useMemo(todayInIndia, []);
  const [values, setValues] = useState<EnquiryFields>({ name: "", phone: "", email: "", message: "", preferredVisitDate: "", website: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  const update = (field: keyof EnquiryFields, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
    setSuccess(false);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFormError("");
    setSuccess(false);
    const parsed = enquirySchema.safeParse({ propertySlug, ...values });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (messages?.[0]) fieldErrors[key as keyof FieldErrors] = messages[0];
      }
      setErrors(fieldErrors);
      return;
    }
    if (values.preferredVisitDate < today) {
      setErrors((current) => ({ ...current, preferredVisitDate: "Choose today or a future date" }));
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json() as { ok?: boolean; message?: string; error?: string; details?: Record<string, string[]> };
      if (!response.ok) {
        const fieldErrors: FieldErrors = {};
        for (const [key, messages] of Object.entries(result.details ?? {})) {
          if (messages?.[0]) fieldErrors[key as keyof FieldErrors] = messages[0];
        }
        setErrors(fieldErrors);
        setFormError(result.error ?? "We could not send your enquiry. Your details are still here; please try again.");
        return;
      }
      setSuccess(true);
      setValues({ name: "", phone: "", email: "", message: "", preferredVisitDate: "", website: "" });
      setErrors({});
    } catch {
      setFormError("A connection issue interrupted your request. Your details are still here; please try again.");
    } finally {
      setPending(false);
    }
  }

  const fieldClass = (field: keyof EnquiryFields) => errors[field] ? "form-control form-control--invalid" : "form-control";

  return (
    <section className="enquiry-card" aria-labelledby="enquiry-heading">
      <div className="enquiry-card__header">
        <span className="eyebrow">LET’S MAKE IT PERSONAL</span>
        <h2 id="enquiry-heading">See yourself <em>here?</em></h2>
        <p>Leave a few details and our residential team will help you take the next step.</p>
      </div>

      {success ? (
        <div className="form-success" role="status">
          <CheckCircle2 size={30} strokeWidth={1.4} aria-hidden="true" />
          <h3>Thank you. We’ll be in touch.</h3>
          <p>Your enquiry for {propertyTitle} has been received.</p>
          <button type="button" className="text-link" onClick={() => setSuccess(false)}>Send another enquiry</button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="enquiry-name">Full name <span>*</span></label>
              <input className={fieldClass("name")} id="enquiry-name" name="name" autoComplete="name" value={values.name} onChange={(event) => update("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "enquiry-name-error" : undefined} required />
              {errors.name ? <p className="field-error" id="enquiry-name-error">{errors.name}</p> : null}
            </div>
            <div className="form-field">
              <label htmlFor="enquiry-phone">Mobile number <span>*</span></label>
              <input className={fieldClass("phone")} id="enquiry-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="10-digit mobile number" value={values.phone} onChange={(event) => update("phone", event.target.value.replace(/\D/g, "").slice(0, 10))} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "enquiry-phone-error" : undefined} required />
              {errors.phone ? <p className="field-error" id="enquiry-phone-error">{errors.phone}</p> : null}
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="enquiry-email">Email address <span className="optional-label">OPTIONAL</span></label>
              <input className={fieldClass("email")} id="enquiry-email" name="email" type="email" autoComplete="email" value={values.email} onChange={(event) => update("email", event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "enquiry-email-error" : undefined} />
              {errors.email ? <p className="field-error" id="enquiry-email-error">{errors.email}</p> : null}
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="enquiry-date">Preferred visit date <span>*</span></label>
              <div className="form-control-with-icon"><input className={fieldClass("preferredVisitDate")} id="enquiry-date" name="preferredVisitDate" type="date" min={today} value={values.preferredVisitDate} onChange={(event) => update("preferredVisitDate", event.target.value)} aria-invalid={Boolean(errors.preferredVisitDate)} aria-describedby={errors.preferredVisitDate ? "enquiry-date-error" : undefined} required /><CalendarDays size={16} aria-hidden="true" /></div>
              {errors.preferredVisitDate ? <p className="field-error" id="enquiry-date-error">{errors.preferredVisitDate}</p> : null}
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="enquiry-message">Anything you’d like us to know? <span>*</span></label>
              <textarea className={fieldClass("message")} id="enquiry-message" name="message" rows={4} maxLength={1000} placeholder="Tell us what matters most in your next home…" value={values.message} onChange={(event) => update("message", event.target.value)} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "enquiry-message-error" : "enquiry-message-help"} required />
              {errors.message ? <p className="field-error" id="enquiry-message-error">{errors.message}</p> : <p className="field-help" id="enquiry-message-help">At least 10 characters. {values.message.length}/1000</p>}
            </div>
          </div>
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="enquiry-website">Leave this field empty</label>
            <input id="enquiry-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(event) => update("website", event.target.value)} />
          </div>
          {formError ? <p className="form-alert" role="alert">{formError}</p> : null}
          <button className="button button--dark enquiry-submit" type="submit" disabled={pending}>
            {pending ? <><LoaderCircle size={16} className="icon-spin" aria-hidden="true" /> Sending your enquiry</> : <>Request a private visit <Send size={15} aria-hidden="true" /></>}
          </button>
          <p className="form-privacy">Your details are used only to respond to this enquiry.</p>
        </form>
      )}
    </section>
  );
}
