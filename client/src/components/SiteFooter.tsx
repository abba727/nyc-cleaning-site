import { Link } from "wouter";
import { Mail, MapPin, Phone } from "lucide-react";
import { brandAssets } from "@/content/assets";
import { company, services, serviceName } from "@/content/site";
import { QuoteCta } from "./QuoteFormOverlay";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <img src={brandAssets.logo} alt="NYC Cleaning and Maintenance" />
          <p>Professional cleaning, porter, staffing, and building maintenance services tailored to properties across New York City.</p>
          <div className="footer-contact">
            <a href={`tel:${company.phoneHref}`}><Phone size={17} aria-hidden="true" /> {company.phoneDisplay}</a>
            <a href={`mailto:${company.email}`}><Mail size={17} aria-hidden="true" /> {company.email}</a>
            <span><MapPin size={17} aria-hidden="true" /> {company.address}</span>
          </div>
        </div>
        <div>
          <h2>Company</h2>
          <Link href="/who-we-are/">Who We Are</Link>
          <Link href="/about-us/">About Us</Link>
          <Link href="/we-serve-new-york/">Service Area</Link>
          <Link href="/careers-and-opportunities/">Careers</Link>
          <Link href="/contact/">Contact</Link>
        </div>
        <div>
          <h2>Popular Services</h2>
          {services.slice(0, 7).map(service => <Link key={service.path} href={service.path}>{serviceName(service)}</Link>)}
        </div>
        <div className="footer-cta">
          <p className="eyebrow">A cleaner property starts here</p>
          <h2>Let’s build your service plan.</h2>
          <p>Tell us about your property and schedule. Our team will follow up with a tailored approach.</p>
          <QuoteCta className="button button-gold">Get a Free Quote</QuoteCta>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} NYC Cleaning and Maintenance. All rights reserved.</span>
        <Link href="/service-guru-app-privacy-policy/">Privacy Policy</Link>
      </div>
    </footer>
  );
}
