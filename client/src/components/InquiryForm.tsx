import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { company, services, serviceName } from "@/content/site";

type InquiryFormProps = { compact?: boolean; sourcePath: string; heading?: string };
type FieldName = "name" | "email" | "phone" | "serviceType" | "message";
type FieldErrors = Partial<Record<FieldName, string>>;

export function formatUsPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function validateInquiryValues(values: Record<FieldName, string>): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Enter a valid email address, such as name@example.com.";
  if (values.phone.replace(/\D/g, "").length !== 10) errors.phone = "Enter a 10-digit US phone number.";
  if (!values.serviceType) errors.serviceType = "Select the service you are interested in.";
  if (values.message.trim().length < 10) errors.message = "Tell us a little more about the property or service you need.";
  return errors;
}

export function InquiryForm({ compact = false, sourcePath, heading = "Request a tailored quote" }: InquiryFormProps) {
  const [success, setSuccess] = useState(false);
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const mutation = trpc.inquiry.submit.useMutation({
    onSuccess: () => setSuccess(true),
    onError: error => {
      const code = error.data?.code;
      setFormError(code === "TOO_MANY_REQUESTS" ? "You’ve sent several requests recently. Please wait a few minutes and try again." : `We couldn’t send your request right now. Please review the highlighted fields or call ${company.phoneDisplay} for immediate help.`);
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const form = new FormData(event.currentTarget);
    const values = {
      name: String(form.get("name") || ""), email: String(form.get("email") || ""), phone,
      serviceType: String(form.get("serviceType") || ""), message: String(form.get("message") || ""),
    };
    const nextErrors = validateInquiryValues(values);
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0] as FieldName | undefined;
    if (firstError) {
      event.currentTarget.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus();
      setFormError("Please correct the highlighted fields and submit again.");
      return;
    }
    mutation.mutate({ inquiryType: "quote", ...values, name: values.name.trim(), email: values.email.trim(), message: values.message.trim(), sourcePath, website: String(form.get("website") || "") });
  };

  if (success) return <div className="form-success" role="status"><CheckCircle2 aria-hidden="true" /><h2>Thank you. Your request is in.</h2><p>Our team will review your information and follow up using the contact details you provided.</p></div>;

  const field = (name: FieldName) => ({ "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `${name}-error` : undefined });
  return (
    <form className={compact ? "inquiry-form compact" : "inquiry-form"} onSubmit={submit} noValidate>
      <div className="form-heading"><p className="eyebrow">Free consultation</p><h2>{heading}</h2></div>
      <div className="form-grid">
        <label><span>Name</span><input name="name" autoComplete="name" required minLength={2} {...field("name")} />{errors.name ? <small id="name-error" className="field-error">{errors.name}</small> : null}</label>
        <label><span>Email</span><input name="email" type="email" inputMode="email" autoComplete="email" required {...field("email")} />{errors.email ? <small id="email-error" className="field-error">{errors.email}</small> : null}</label>
        <label><span>Phone</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={event => { setPhone(formatUsPhone(event.target.value)); if (errors.phone) setErrors(current => ({ ...current, phone: undefined })); }} placeholder="(212) 555-0123" required maxLength={14} {...field("phone")} />{errors.phone ? <small id="phone-error" className="field-error">{errors.phone}</small> : null}</label>
        <label><span>Service type</span><select name="serviceType" required defaultValue="" {...field("serviceType")}><option value="" disabled>Select a service</option>{services.map(service => <option key={service.path} value={serviceName(service)}>{serviceName(service)}</option>)}<option value="Other / Not sure">Other / Not sure</option></select>{errors.serviceType ? <small id="serviceType-error" className="field-error">{errors.serviceType}</small> : null}</label>
        <label className="full"><span>Tell us about your property</span><textarea name="message" required minLength={10} rows={compact ? 4 : 6} {...field("message")} />{errors.message ? <small id="message-error" className="field-error">{errors.message}</small> : null}</label>
        <label className="honeypot" aria-hidden="true"><span>Website</span><input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <button type="submit" className="button button-gold" disabled={mutation.isPending}>{mutation.isPending ? <><Loader2 className="spin" size={18} /> Sending…</> : "Request My Quote"}</button>
      <p className="form-note">By submitting, you agree that NYC Cleaning and Maintenance may contact you about this request.</p>
    </form>
  );
}
