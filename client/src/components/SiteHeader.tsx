import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { brandAssets } from "@/content/assets";
import { company, serviceGroups, serviceName } from "@/content/site";

const mainLinks = [
  { href: "/", label: "Home" },
  { href: "/cleaning-service-nyc/", label: "Services" },
  { href: "/who-we-are/", label: "Who We Are" },
  { href: "/we-serve-new-york/", label: "Service Area" },
  { href: "/blog/", label: "Insights" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>Serving New York City’s five boroughs</span>
          <a href={`tel:${company.phoneHref}`}><Phone size={14} aria-hidden="true" /> {company.phoneDisplay}</a>
        </div>
      </div>
      <div className="container nav-shell">
        <Link href="/" className="brand-link" aria-label="NYC Cleaning and Maintenance home">
          <img src={brandAssets.logo} alt="NYC Cleaning and Maintenance" className="brand-logo" width={508} height={224} />
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {mainLinks.map(link => (
            link.label === "Services" ? (
              <div className="nav-dropdown" key={link.href}>
                <Link href={link.href} className={location.startsWith("/services/") || location === link.href ? "nav-link active" : "nav-link"}>
                  Services <ChevronDown size={15} aria-hidden="true" />
                </Link>
                <div className="service-menu">
                  <div className="service-menu-grid">{serviceGroups.map(group => <div className="service-menu-group" key={group.label}><p>{group.label}</p>{group.services.map(service => <Link key={service.path} href={service.path}>{serviceName(service)}</Link>)}</div>)}</div>
                  <Link href="/cleaning-service-nyc/" className="service-menu-all">View all services</Link>
                </div>
              </div>
            ) : (
              <Link key={link.href} href={link.href} className={location === link.href ? "nav-link active" : "nav-link"}>{link.label}</Link>
            )
          ))}
        </nav>

        <div className="nav-actions">
          <Link href="/contact/" className="button button-gold">Request a Quote</Link>
          <button className="menu-toggle" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close navigation" : "Open navigation"}>
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" className="mobile-nav" aria-label="Mobile navigation">
          <div className="container mobile-nav-inner">
            {mainLinks.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
            <div className="mobile-services">{serviceGroups.map(group => <div className="mobile-service-group" key={group.label}><p>{group.label}</p>{group.services.map(service => <Link key={service.path} href={service.path} onClick={() => setOpen(false)}>{serviceName(service)}</Link>)}</div>)}</div>
            <Link href="/contact/" className="button button-gold" onClick={() => setOpen(false)}>Request a Quote</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
