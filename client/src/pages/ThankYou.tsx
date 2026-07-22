import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { company, siteOrigin } from "@/content/site";

export default function ThankYou() {
  useEffect(() => {
    document.title = "Thank You | NYC Cleaning";
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", "Thank you for contacting NYC Cleaning. Our team will follow up about your property-care request.");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", `${siteOrigin}/thank-you/`);
  }, []);

  return (
    <section className="section section-cream">
      <div className="container">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm sm:px-12">
          <CheckCircle2 className="mx-auto h-14 w-14 text-[#14846f]" aria-hidden="true" />
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#14846f]">Request received</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Thank you for contacting NYC Cleaning.</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600">We have received your request and will follow up using the contact details you provided.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className="button button-navy">Return to home</Link>
            <a href={`tel:${company.phoneHref}`} className="button button-gold">Call {company.phoneDisplay}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
