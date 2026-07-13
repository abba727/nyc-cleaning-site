import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { services, serviceName } from "@/content/site";

type InquiryFormProps = { compact?: boolean; sourcePath: string; heading?: string };

export function InquiryForm({ compact = false, sourcePath, heading = "Request a tailored quote" }: InquiryFormProps) {
  const [success, setSuccess] = useState(false);
  const mutation = trpc.inquiry.submit.useMutation({ onSuccess: () => setSuccess(true) });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      inquiryType: "quote",
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      serviceType: String(form.get("serviceType") || ""),
      message: String(form.get("message") || ""),
      sourcePath,
      website: String(form.get("website") || ""),
    });
  };

  if (success) {
    return <div className="form-success" role="status"><CheckCircle2 aria-hidden="true" /><h2>Thank you. Your request is in.</h2><p>Our team will review your information and follow up using the contact details you provided.</p></div>;
  }

  return (
    <form className={compact ? "inquiry-form compact" : "inquiry-form"} onSubmit={submit}>
      <div className="form-heading"><p className="eyebrow">Free consultation</p><h2>{heading}</h2></div>
      <div className="form-grid">
        <label><span>Name</span><input name="name" autoComplete="name" required minLength={2} /></label>
        <label><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
        <label><span>Phone</span><input name="phone" type="tel" autoComplete="tel" required minLength={7} /></label>
        <label><span>Service type</span><select name="serviceType" required defaultValue=""><option value="" disabled>Select a service</option>{services.map(service => <option key={service.path} value={serviceName(service)}>{serviceName(service)}</option>)}<option value="Other / Not sure">Other / Not sure</option></select></label>
        <label className="full"><span>Tell us about your property</span><textarea name="message" required minLength={10} rows={compact ? 4 : 6} /></label>
        <label className="honeypot" aria-hidden="true"><span>Website</span><input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
      <button type="submit" className="button button-gold" disabled={mutation.isPending}>{mutation.isPending ? <><Loader2 className="spin" size={18} /> Sending…</> : "Request My Quote"}</button>
      <p className="form-note">By submitting, you agree that NYC Cleaning and Maintenance may contact you about this request.</p>
    </form>
  );
}
