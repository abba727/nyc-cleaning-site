import { useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, BadgeCheck, Building2, CalendarDays, CheckCircle2, Clock3, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";
import { InquiryForm } from "./InquiryForm";
import { brandAssets } from "@/content/assets";
import { articlesForArchive, company, featuredServices, getArticleImage, getArticleImageAlt, getLegacyByPath, getPageByPath, getPageImage, homepageServices, isBlogArchivePath, legacyArchives, legacyArticles, normalizePath, pageParagraphs, services, serviceName, siteOrigin, type LegacyContent, type SitePage } from "@/content/site";
import { getServiceContent } from "@/content/service-content";
import { trpc } from "@/lib/trpc";

type ArticleView = LegacyContent & { coverImageUrl?: string; coverImageAlt?: string };

function databaseArticleToView(article: {
  path: string;
  title: string;
  excerpt: string | null;
  description: string;
  body: LegacyContent["blocks"] | null;
  blocks: LegacyContent["blocks"];
  coverImageUrl: string;
  coverImageAlt: string;
  publishedAt: Date | null;
}): ArticleView {
  return {
    kind: "article",
    path: article.path,
    title: article.title,
    description: article.excerpt || article.description,
    blocks: article.body?.length ? article.body : article.blocks,
    publishedAt: article.publishedAt ? article.publishedAt.toISOString().slice(0, 10) : "",
    sourceUrl: "",
    coverImageUrl: article.coverImageUrl,
    coverImageAlt: article.coverImageAlt,
  };
}

const articleImage = (content: ArticleView) => content.coverImageUrl || getArticleImage(content);
const articleImageAlt = (content: ArticleView) => content.coverImageAlt || getArticleImageAlt(content);

function ClientHead({ page }: { page: SitePage }) {
  useEffect(() => {
    document.title = page.title;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", page.description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", `${siteOrigin}${normalizePath(page.path)}`);
  }, [page]);
  return null;
}

function ServiceCards({ limit, items, compact = false }: { limit?: number; items?: SitePage[]; compact?: boolean }) {
  const source = items || featuredServices;
  const list = typeof limit === "number" ? source.slice(0, limit) : source;
  return <div className={compact ? "service-grid service-grid-compact" : "service-grid"}>{list.map((service, index) => <article className="service-card" key={service.path}><Link href={service.path} className="service-image"><img src={getPageImage(service)} alt={`${serviceName(service)} in New York City`} loading={index < 3 ? "eager" : "lazy"} /></Link><div className="service-card-body"><p className="eyebrow">NYC property care</p><h3><Link href={service.path}>{serviceName(service)}</Link></h3>{!compact && <p>{service.description}</p>}<Link href={service.path} className="text-link">Explore service <ArrowRight size={16} aria-hidden="true" /></Link></div></article>)}</div>;
}

function TrustStrip() {
  return <section className="trust-strip" aria-label="Why property teams choose NYC Cleaning"><div className="container trust-grid"><div><BadgeCheck aria-hidden="true" /><strong>500+</strong><span>Active clients</span></div><div><Users aria-hidden="true" /><strong>Professional</strong><span>Trained staff and support</span></div><div><Clock3 aria-hidden="true" /><strong>Flexible</strong><span>Custom service schedules</span></div><div><MapPin aria-hidden="true" /><strong>Local</strong><span>Across New York City</span></div></div></section>;
}

function HomePage({ page }: { page: SitePage }) {
  return <>
    <section className="home-hero">
      <img src={getPageImage(page)} alt="Professional NYC Cleaning team maintaining a New York commercial property" className="hero-bg" />
      <div className="hero-overlay" />
      <div className="container hero-content"><p className="eyebrow light">Cleaning • Maintenance • Staffing</p><h1>Cleaner buildings. Reliable property care.</h1><p>Full-service cleaning and maintenance for commercial and residential properties across New York City.</p><div className="button-row"><Link href="/contact/" className="button button-gold">Get a Free Quote</Link><Link href="/cleaning-service-nyc/" className="button button-outline-light">Explore Services</Link></div></div>
      <div className="hero-card"><span>Call our NYC team</span><a href={`tel:${company.phoneHref}`}>{company.phoneDisplay}</a><small>Tailored schedules. Reliable property care.</small></div>
    </section>
    <TrustStrip />
    <section className="section"><div className="container"><div className="section-heading split"><div><p className="eyebrow">One partner, complete property care</p><h2>Cleaning and maintenance built around your building.</h2></div><p>Four clear service groups make it easy to find the right support while every specialized service remains available in the complete catalog.</p></div><ServiceCards items={homepageServices} compact /><div className="center-action"><Link href="/cleaning-service-nyc/" className="button button-navy">View All Services</Link></div></div></section>
    <section className="section section-navy"><div className="container story-grid"><div className="story-image"><img src={getPageImage(getPageByPath("/who-we-are/") || page)} alt="NYC Cleaning and Maintenance team serving a New York property" loading="lazy" /><div className="image-note"><strong>Established in 2020</strong><span>Built by property-operations professionals</span></div></div><div className="story-copy"><p className="eyebrow light">A property-minded cleaning partner</p><h2>Clean, safe spaces strengthen New York communities.</h2><p>NYC Cleaning and Maintenance partners with landlords and property managers to deliver dependable cleaning and maintenance, one property at a time.</p><ul className="check-list"><li><CheckCircle2 />Custom schedules around building operations</li><li><CheckCircle2 />Coverage for commercial and residential assets</li><li><CheckCircle2 />Cleaning, waste handling, staffing, and maintenance</li></ul><Link href="/who-we-are/" className="button button-gold">Meet NYC Cleaning</Link></div></div></section>
    <section className="section"><div className="container process-layout"><div><p className="eyebrow">Simple, accountable service</p><h2>From walkthrough to a cleaner property.</h2></div><ol className="process-list"><li><span>01</span><div><h3>Tell us about the property</h3><p>Share the building type, schedule, priorities, and current challenges.</p></div></li><li><span>02</span><div><h3>Review a tailored plan</h3><p>We align services and frequency with your operations and budget.</p></div></li><li><span>03</span><div><h3>Put the team to work</h3><p>Our staff delivers the agreed scope with responsive ongoing support.</p></div></li></ol></div></section>
    <section className="section section-contact"><div className="container contact-band"><div><p className="eyebrow light">Let’s talk about your property</p><h2>Get a cleaning and maintenance plan designed for your building.</h2><p>Send your details and our team will follow up to learn more about your service needs.</p><a href={`tel:${company.phoneHref}`} className="phone-link">{company.phoneDisplay}</a></div><InquiryForm compact sourcePath="/" /></div></section>
  </>;
}

function ContactPage({ page }: { page: SitePage }) {
  return <><InteriorHero page={page} /><section className="section"><div className="container contact-page-grid"><div><p className="eyebrow">Contact NYC Cleaning</p><h2>Tell us how we can help.</h2><p>Whether you manage an office, residential building, mixed-use property, or commercial facility, we’ll build a plan around your operating needs.</p><div className="contact-details"><a href={`tel:${company.phoneHref}`}><span><Building2 /></span><div><small>Call</small><strong>{company.phoneDisplay}</strong></div></a><a href={`mailto:${company.email}`}><span><Sparkles /></span><div><small>Email</small><strong>{company.email}</strong></div></a><div><span><MapPin /></span><div><small>Mailing address</small><strong>{company.address}</strong></div></div></div></div><InquiryForm sourcePath={page.path} heading="Request a free consultation" /></div></section></>;
}

function InteriorHero({ page }: { page: SitePage }) {
  const isLegal = page.kind === "legal";
  const displayTitle = page.kind === "service" ? serviceName(page) : page.h1;
  return <section className={isLegal ? "interior-hero legal" : "interior-hero"}><div className="container interior-hero-grid"><div><p className="eyebrow light">{page.kind === "service" ? "Professional property services" : "NYC Cleaning and Maintenance"}</p><h1>{displayTitle}</h1><p>{page.description}</p>{!isLegal && <div className="button-row"><Link href="/contact/" className="button button-gold">Request a Quote</Link><a href={`tel:${company.phoneHref}`} className="button button-outline-light">Call {company.phoneDisplay}</a></div>}</div>{!isLegal && <div className="interior-image"><img src={getPageImage(page)} alt={`${displayTitle} from NYC Cleaning and Maintenance`} /></div>}</div></section>;
}

function StandardPage({ page }: { page: SitePage }) {
  const paragraphs = pageParagraphs(page);
  const isServices = page.path === "/cleaning-service-nyc/";
  const isLegal = page.kind === "legal";
  return <>
    <InteriorHero page={page} />
    <section className="section"><div className="container content-layout"><article className="longform"><p className="eyebrow">{page.kind === "service" ? "Service overview" : "Our approach"}</p><h2>{page.kind === "service" ? `Dependable ${serviceName(page)} for New York properties.` : "Built around New York properties and the people who rely on them."}</h2>{paragraphs.map((paragraph, index) => index === 0 ? <p className="lead" key={paragraph}>{paragraph}</p> : <p key={`${paragraph}-${index}`}>{paragraph}</p>)}</article>{!isLegal && <aside className="service-aside"><ShieldCheck aria-hidden="true" /><h2>Need a tailored scope?</h2><p>We’ll review your property, priorities, schedule, and service requirements.</p><Link href="/contact/" className="button button-gold">Start a Conversation</Link><a href={`tel:${company.phoneHref}`}>{company.phoneDisplay}</a></aside>}</div></section>
    {isServices && <section className="section section-cream"><div className="container"><div className="section-heading"><p className="eyebrow">Complete service catalog</p><h2>Find the right support for your property.</h2></div><ServiceCards /></div></section>}
    {page.kind === "service" && <><section className="section section-cream"><div className="container"><div className="section-heading split"><div><p className="eyebrow">Related capabilities</p><h2>More ways we support NYC properties.</h2></div><p>Combine cleaning, staffing, waste handling, and maintenance into one practical property-care plan.</p></div><ServiceCards limit={3} /></div></section><section className="section section-contact"><div className="container contact-band"><div><p className="eyebrow light">Build your service plan</p><h2>Talk with our team about {serviceName(page).toLowerCase()}.</h2><p>Tell us about your property and schedule. We’ll follow up with a tailored next step.</p></div><InquiryForm compact sourcePath={page.path} /></div></section></>}
  </>;
}

export function extractServiceFaqs(paragraphs: string[]) {
  const questionPattern = /(?:^|(?<=[.!]\s))((?:What|Why|How|When|Where|Who|Which|Can|Do|Does|Are|Is|Should|Will|Could|Would|Have|Has)\b[^?]{5,220}\?)/i;
  return paragraphs.flatMap((paragraph, index) => {
    const match = paragraph.match(questionPattern);
    if (!match?.[1]) return [];
    const question = match[1].trim();
    const answer = `${paragraph.slice(0, match.index || 0)} ${paragraph.slice((match.index || 0) + match[0].length)}`.replace(/\s+/g, " ").trim();
    if (!answer) return [];
    return [{ question, answers: [answer], sourceIndex: index }];
  });
}

function ServiceDetailPage({ page }: { page: SitePage }) {
  const content = getServiceContent(page.path);
  if (!content) return <StandardPage page={page} />;
  const related = content.relatedPaths
    .map(path => getPageByPath(path))
    .filter((service): service is SitePage => Boolean(service));

  return <>
    <InteriorHero page={page} />
    <section className="section service-intro-section"><div className="container service-intro-layout"><article className="service-intro-copy"><p className="eyebrow">Service overview</p><h2>{serviceName(page)} designed around your needs.</h2><p className="lead">{content.intro}</p></article><aside className="service-quote-card"><ShieldCheck aria-hidden="true" /><p className="eyebrow">Built around your property</p><h2>Get a scope that fits.</h2><p>We’ll review your priorities, schedule, service requirements, and operating constraints.</p><Link href="/contact/" className="button button-gold">Request a Walkthrough</Link><a href={`tel:${company.phoneHref}`}>{company.phoneDisplay}</a></aside></div></section>

    <section className="section service-benefits-section"><div className="container service-benefits-layout"><div className="service-benefits-heading"><p className="eyebrow">How this service helps</p><h2>Practical benefits for your property and the people who use it.</h2><p>We shape the work around the outcome you need, not a one-size-fits-all checklist.</p></div><ul className="service-benefit-list">{content.benefits.map(benefit => <li key={benefit}><CheckCircle2 aria-hidden="true" /><span>{benefit}</span></li>)}</ul></div></section>

    <section className="section section-contact"><div className="container contact-band"><div><p className="eyebrow light">Plan your service</p><h2>Talk with us about {serviceName(page).toLowerCase()}.</h2><p>Tell us about your property, priorities, and preferred schedule. We’ll recommend a practical next step.</p></div><InquiryForm compact sourcePath={page.path} /></div></section>
    <section className="section related-services-section"><div className="container"><div className="section-heading split"><div><p className="eyebrow">Similar services</p><h2>Explore other ways we can support your property.</h2></div><p>These services complement {serviceName(page).toLowerCase()} and can be combined in one coordinated property-care plan.</p></div><ServiceCards items={related} /></div></section>
  </>;
}

function ClientLegacyHead({ content }: { content: LegacyContent | null }) {
  useEffect(() => {
    const title = content?.title || "Cleaning Insights | NYC Cleaning and Maintenance";
    const description = content?.description || "Practical cleaning and property-maintenance guidance from NYC Cleaning and Maintenance.";
    const path = content?.path || "/blog/";
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", `${siteOrigin}${normalizePath(path)}`);
  }, [content]);
  return null;
}

function ArticleBody({ content }: { content: ArticleView }) {
  const output: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (!list.length) return;
    output.push(<ul className="article-list" key={`list-${output.length}`}>{list.map(item => <li key={item}>{item}</li>)}</ul>);
    list = [];
  };
  content.blocks.forEach((block, index) => {
    if (block.type === "li") {
      list.push(block.text);
      return;
    }
    flushList();
    if (block.type === "h2") output.push(<h2 key={`${block.type}-${index}`}>{block.text}</h2>);
    else if (block.type === "h3") output.push(<h3 key={`${block.type}-${index}`}>{block.text}</h3>);
    else output.push(<p key={`${block.type}-${index}`}>{block.text}</p>);
  });
  flushList();
  return <>{output}</>;
}

function LegacyArticlePage({ content }: { content: ArticleView }) {
  return <>
    <ClientLegacyHead content={content} />
    <section className="article-hero"><div className="container article-hero-inner"><div><p className="eyebrow light">NYC cleaning insights</p><h1>{content.title.replace(/\s*[|–-]\s*NYC Cleaning.*$/i, "")}</h1>{content.publishedAt && <p className="article-date"><CalendarDays size={18} aria-hidden="true" />{new Date(`${content.publishedAt}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</p>}</div><img src={articleImage(content)} alt={articleImageAlt(content)} /></div></section>
    <section className="section"><div className="container article-layout"><article className="article-content"><ArticleBody content={content} /></article><aside className="service-aside"><ShieldCheck aria-hidden="true" /><h2>Need dependable property care?</h2><p>Tell us about your building, operating hours, and cleaning or maintenance priorities.</p><Link href="/contact/" className="button button-gold">Request a Quote</Link><a href={`tel:${company.phoneHref}`}>{company.phoneDisplay}</a></aside></div></section>
    <section className="section section-cream"><div className="container review-invite"><div><p className="eyebrow">More NYC property insights</p><h2>Explore practical cleaning and maintenance guidance.</h2></div><Link href="/blog/" className="button button-navy">View All Articles</Link></div></section>
  </>;
}

const archiveLabel = (path: string) => {
  const match = normalizePath(path).match(/^\/(\d{4})\/(\d{2})\/$/);
  if (!match) return path;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
};

function BlogArchivePage({ content, databaseArticles }: { content: LegacyContent | null; databaseArticles?: ArticleView[] }) {
  const locationPath = content?.path || "/blog/";
  const isMonthlyArchive = content?.kind === "archive";
  const articles = databaseArticles?.length
    ? (isMonthlyArchive
      ? databaseArticles.filter(article => article.publishedAt.startsWith(locationPath.slice(1, 8).replace("/", "-")))
      : databaseArticles.slice(0, 12))
    : (isMonthlyArchive
      ? articlesForArchive(locationPath)
      : [...legacyArticles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 12));
  const monthArchives = [...legacyArchives].sort((a, b) => b.path.localeCompare(a.path));
  const title = content?.title.replace(/\s*[|–-]\s*NYC Cleaning.*$/i, "") || "Cleaning and Property Maintenance Insights";
  return <>
    <ClientLegacyHead content={content} />
    <section className="interior-hero legal"><div className="container interior-hero-grid"><div><p className="eyebrow light">NYC Cleaning and Maintenance</p><h1>{title}</h1><p>Source-preserved guidance for commercial, residential, mixed-use, and office properties across New York City.</p></div></div></section>
    <section className="section"><div className="container"><div className="section-heading split"><div><p className="eyebrow">{isMonthlyArchive ? "Archive" : "Latest guidance"}</p><h2>{isMonthlyArchive ? title : "Recent cleaning and property-care articles."}</h2></div><p>{isMonthlyArchive ? "Browse articles published during this month." : "Start with the latest practical guidance, or use the monthly archive to explore the complete collection."}</p></div><div className="article-grid">{articles.map(article => <article className="article-card" key={article.path}><Link href={article.path} className="article-card-image"><img src={articleImage(article)} alt={articleImageAlt(article)} /></Link><div className="article-card-body"><p className="eyebrow">Cleaning insights</p><h2><Link href={article.path}>{article.title.replace(/\s*[|–-]\s*NYC Cleaning.*$/i, "")}</Link></h2><p>{article.description}</p><Link href={article.path} className="text-link">Read article <ArrowRight size={16} aria-hidden="true" /></Link></div></article>)}</div></div></section>
    {!isMonthlyArchive && <section className="section section-cream"><div className="container archive-browser"><div><p className="eyebrow">Complete archive</p><h2>Browse insights by month.</h2><p>All preserved articles remain available at their original URLs and can now be managed from the owner workspace.</p></div><div className="archive-months">{monthArchives.map(archive => <Link href={archive.path} key={archive.path}>{archiveLabel(archive.path)}<ArrowRight size={15} aria-hidden="true" /></Link>)}</div></div></section>}
  </>;
}

export function PublicPage() {
  const [location] = useLocation();
  const page = getPageByPath(location);
  const legacy = getLegacyByPath(location);
  const archiveRoute = legacy?.kind === "archive" || isBlogArchivePath(location);
  const articlePathInput = useMemo(() => ({ path: normalizePath(location) }), [location]);
  const articleQuery = trpc.article.byPath.useQuery(articlePathInput, { enabled: !page && !archiveRoute, retry: false });
  const publishedQuery = trpc.article.listPublished.useQuery(undefined, { enabled: archiveRoute, retry: false });
  const databaseArticle = articleQuery.data ? databaseArticleToView(articleQuery.data) : null;
  const databaseArticles = publishedQuery.data?.map(databaseArticleToView);
  if (databaseArticle) return <LegacyArticlePage content={databaseArticle} />;
  if (legacy?.kind === "article") return <LegacyArticlePage content={legacy} />;
  if (archiveRoute) return <BlogArchivePage content={legacy || null} databaseArticles={databaseArticles} />;
  if (!page && articleQuery.isLoading) return <section className="section not-found"><div className="container"><p className="eyebrow">Loading</p><h1>Opening article…</h1></div></section>;
  if (!page) return <section className="section not-found"><div className="container"><p className="eyebrow">404</p><h1>That page could not be found.</h1><p>The page may have moved, or the address may be incomplete.</p><Link href="/" className="button button-navy">Return Home</Link></div></section>;
  return <><ClientHead page={page} />{page.path === "/" ? <HomePage page={page} /> : page.path === "/contact/" || page.path === "/we-serve-new-york/" ? <ContactPage page={page} /> : page.kind === "service" && page.path !== "/cleaning-service-nyc/" ? <ServiceDetailPage page={page} /> : <StandardPage page={page} />}</>;
}
