import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, CalendarDays, ShieldCheck } from "lucide-react";
import { brandAssets } from "@/content/assets";
import { getResponsiveMedia } from "@/content/responsive-media";
import { company, featuredServices, getPageImage, isBlogArchivePath, normalizePath, serviceName, siteOrigin, type LegacyContent, type SitePage } from "@/content/site";
import { useLegacyContent } from "@/contexts/LegacyContentContext";
import { ClientDataProvider } from "./ClientDataProvider";
import { trpc } from "@/lib/trpc";
import type { InitialPublishedArticle } from "./PublicPage";

type ArticleView = LegacyContent & { coverImageUrl?: string; coverImageAlt?: string };

const ARTICLES_PER_PAGE = 9;
const BLOG_SERVICE_PATHS = new Set([
  "/services/commercial-cleaning-nyc/",
  "/services/deep-cleaning-services-nyc/",
  "/services/porter-services-nyc/",
]);
const blogServiceHighlights = featuredServices.filter(service => BLOG_SERVICE_PATHS.has(service.path));

export function databaseArticleToView(article: {
  path: string;
  title: string;
  excerpt: string | null;
  description: string;
  body: LegacyContent["blocks"] | null;
  blocks: LegacyContent["blocks"];
  coverImageUrl: string;
  coverImageAlt: string;
  publishedAt: Date | string | null;
}): ArticleView {
  return {
    kind: "article",
    path: article.path,
    title: article.title,
    description: article.excerpt || article.description,
    blocks: article.body?.length ? article.body : article.blocks,
    publishedAt: article.publishedAt ? (typeof article.publishedAt === "string" ? article.publishedAt.slice(0, 10) : article.publishedAt.toISOString().slice(0, 10)) : "",
    sourceUrl: "",
    coverImageUrl: article.coverImageUrl,
    coverImageAlt: article.coverImageAlt,
  };
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
  const output: ReactNode[] = [];
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

function ArticleImage({
  content,
  loading = "lazy",
  fetchPriority = "auto",
}: {
  content: ArticleView;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
}) {
  const { payload } = useLegacyContent();
  const image = content.coverImageUrl || payload?.images[normalizePath(content.path)]?.src || brandAssets.commercialCleaning;
  const alt = content.coverImageAlt || payload?.images[normalizePath(content.path)]?.alt || `NYC Cleaning insight: ${content.title}`;
  return <img src={image} alt={alt} loading={loading} fetchPriority={fetchPriority} decoding="async" />;
}

function ServiceHighlightImage({ service }: { service: SitePage }) {
  const image = getPageImage(service);
  const responsiveMedia = getResponsiveMedia(image);
  const alt = `${serviceName(service)} in New York City`;

  if (!responsiveMedia) return <img src={image} alt={alt} loading="lazy" decoding="async" />;

  return <picture className="responsive-picture">
    <source type="image/avif" srcSet={responsiveMedia.avifSrcSet} sizes={responsiveMedia.sizes} />
    <source type="image/webp" srcSet={responsiveMedia.fallbackSrcSet} sizes={responsiveMedia.sizes} />
    <img src={image} srcSet={responsiveMedia.fallbackSrcSet} sizes={responsiveMedia.sizes} alt={alt} loading="lazy" decoding="async" />
  </picture>;
}

export function ArticleCard({ article, index }: { article: ArticleView; index?: number }) {
  const publishedDate = formatPublicationDate(article.publishedAt);
  const articleTitle = article.title.replace(/\s*[|–-]\s*NYC Cleaning.*$/i, "");
  const isEager = typeof index === "number" && index < 3;
  return (
    <article className="article-card">
      <Link href={article.path} className="article-card-image" aria-label={`Read ${articleTitle}`}>
        <ArticleImage content={article} loading={isEager ? "eager" : "lazy"} fetchPriority={isEager ? "high" : "auto"} />
        <span className="article-card-image-shade" aria-hidden="true" />
      </Link>
      <div className="article-card-body">
        <p className="article-card-meta">
          {publishedDate ? <><CalendarDays size={15} aria-hidden="true" />{publishedDate}</> : "NYC Cleaning insights"}
        </p>
        <h2><Link href={article.path}>{articleTitle}</Link></h2>
        <p className="article-card-excerpt">{article.description}</p>
        <Link href={article.path} className="text-link">
          Read article <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function InsightServicesSection({ articleTitle }: { articleTitle?: string }) {
  return (
    <section className="section section-cream insights-services-section">
      <div className="container">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Services for your property</p>
            <h2>{articleTitle ? "Put this insight to work in your building." : "Turn helpful insight into dependable property care."}</h2>
          </div>
          <p>From ongoing cleaning to deeper resets and day-to-day porter support, we build practical service plans around your building.</p>
        </div>
        <div className="service-grid">
          {blogServiceHighlights.map(service => (
            <article className="service-card" key={service.path}>
              <Link href={service.path} className="service-image" aria-label={`Explore ${serviceName(service)}`}>
                <ServiceHighlightImage service={service} />
              </Link>
              <div className="service-card-body">
                <p className="eyebrow">NYC property care</p>
                <h3><Link href={service.path}>{serviceName(service)}</Link></h3>
                <p>{service.description}</p>
                <Link href={service.path} className="text-link">Explore service <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            </article>
          ))}
        </div>
        <div className="insights-services-cta">
          <Link href="/cleaning-service-nyc/" className="button button-navy">Explore All Services</Link>
          <Link href="/contact/" className="text-link">Request a tailored quote <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}

function LegacyArticlePage({ content }: { content: ArticleView }) {
  const publishedDate = formatPublicationDate(content.publishedAt, { month: "long", day: "numeric", year: "numeric" });
  return <>
    <ClientLegacyHead content={content} />
    <section className="article-hero"><div className="container article-hero-inner"><div><p className="eyebrow light">NYC cleaning insights</p><h1>{content.title.replace(/\s*[|–-]\s*NYC Cleaning.*$/i, "")}</h1>{publishedDate && <p className="article-date"><CalendarDays size={18} aria-hidden="true" />{publishedDate}</p>}</div><ArticleImage content={content} loading="eager" fetchPriority="high" /></div></section>
    <section className="section"><div className="container article-layout"><article className="article-content"><ArticleBody content={content} /></article><aside className="service-aside"><ShieldCheck aria-hidden="true" /><h2>Need dependable property care?</h2><p>Tell us about your building, operating hours, and cleaning or maintenance priorities.</p><Link href="/contact/" className="button button-gold">Request a Quote</Link><a href={`tel:${company.phoneHref}`}>{company.phoneDisplay}</a></aside></div></section>
    <InsightServicesSection articleTitle={content.title} />
    <section className="section section-cream"><div className="container review-invite"><div><p className="eyebrow">More NYC property insights</p><h2>Explore practical cleaning and maintenance guidance.</h2></div><Link href="/blog/" className="button button-navy">View All Articles</Link></div></section>
  </>;
}

function formatPublicationDate(value: string | Date | null | undefined, format: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return null;
  const source = value instanceof Date ? value : /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value;
  const date = source instanceof Date ? source : new Date(source);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { ...format, timeZone: "UTC" }).format(date);
}

function BlogArchivePage({ content, databaseArticles }: { content: LegacyContent | null; databaseArticles?: ArticleView[] }) {
  const { payload } = useLegacyContent();
  const [selectedPage, setSelectedPage] = useState(1);
  const locationPath = content?.path || "/blog/";
  const isMonthlyArchive = content?.kind === "archive";
  const staticArticles = payload?.content.filter(item => item.kind === "article") || [];
  const articles = databaseArticles?.length
    ? (isMonthlyArchive
      ? databaseArticles.filter(article => article.publishedAt.startsWith(locationPath.slice(1, 8).replace("/", "-")))
      : databaseArticles)
    : (isMonthlyArchive
      ? staticArticles.filter(article => article.publishedAt.startsWith(locationPath.slice(1, 8).replace("/", "-")))
      : [...staticArticles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)));
  const sourceTitle = content?.title.replace(/\s*[|–-]\s*NYC Cleaning.*$/i, "") || "Cleaning and Property Maintenance Insights";
  const title = isMonthlyArchive ? sourceTitle : "Insights for New York properties";
  const totalPages = Math.max(1, Math.ceil(articles.length / ARTICLES_PER_PAGE));
  const currentPage = Math.min(selectedPage, totalPages);
  const pageStart = (currentPage - 1) * ARTICLES_PER_PAGE;
  const pageArticles = articles.slice(pageStart, pageStart + ARTICLES_PER_PAGE);

  const changePage = (nextPage: number) => {
    const boundedPage = Math.max(1, Math.min(nextPage, totalPages));
    setSelectedPage(boundedPage);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => document.getElementById("insights-articles")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  return <>
    <ClientLegacyHead content={content} />
    <section className="interior-hero legal insights-hero"><div className="container interior-hero-grid"><div><p className="eyebrow light">NYC Cleaning and Maintenance</p><h1>{title}</h1><p>{isMonthlyArchive ? "Browse practical guidance published during this month." : "Practical strategies, industry trends, and expert guidance designed to help property managers, landlords, and facility teams elevate their operations across New York City."}</p></div></div></section>
    <section className="section insights-archive-section" id="insights-articles"><div className="container"><div className="section-heading split"><div><p className="eyebrow">{isMonthlyArchive ? "Archive" : "Latest insights"}</p><h2>{isMonthlyArchive ? sourceTitle : "Explore every recent article."}</h2></div><p>{isMonthlyArchive ? "Select an article to read the full guidance." : "Read the latest guidance and property-care strategies from the NYC Cleaning team."}</p></div>{articles.length ? <><div className="article-grid">{pageArticles.map((article, index) => <ArticleCard key={article.path} article={article} index={index} />)}</div>{totalPages > 1 && <nav className="insights-pagination" aria-label="Insights pages"><p className="insights-pagination-summary">Browse more property-care guidance.</p><div className="insights-pagination-controls"><button type="button" className="pagination-button pagination-button-direction" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1}><ArrowLeft size={16} aria-hidden="true" />Previous</button>{Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => <button type="button" className="pagination-button" key={pageNumber} onClick={() => changePage(pageNumber)} aria-current={currentPage === pageNumber ? "page" : undefined}>{pageNumber}</button>)}<button type="button" className="pagination-button pagination-button-direction" onClick={() => changePage(currentPage + 1)} disabled={currentPage === totalPages}>Next<ArrowRight size={16} aria-hidden="true" /></button></div></nav>}</> : <p className="archive-empty">New insights will appear here as soon as they are published.</p>}</div></section>
    {!isMonthlyArchive && <InsightServicesSection />}
  </>;
}

export function LegacyContentRoute({ path, initialArticle, initialNotFoundPath }: { path: string; initialArticle?: InitialPublishedArticle | null; initialNotFoundPath?: string | null }) {
  const { payload, loading, error, load } = useLegacyContent();
  const normalizedPath = useMemo(() => normalizePath(path), [path]);
  const legacy = payload?.content.find(item => normalizePath(item.path) === normalizedPath) || null;
  const archiveRoute = legacy?.kind === "archive" || isBlogArchivePath(normalizedPath);
  const initialDatabaseArticle = initialArticle && normalizePath(initialArticle.path) === normalizedPath ? databaseArticleToView(initialArticle) : null;
  const isInitialNotFound = Boolean(initialNotFoundPath && normalizePath(initialNotFoundPath) === normalizedPath);
  const articleQuery = trpc.article.byPath.useQuery({ path: normalizedPath }, { enabled: !archiveRoute && !initialDatabaseArticle && !isInitialNotFound, retry: false });
  const publishedQuery = trpc.article.listPublished.useQuery(undefined, { enabled: archiveRoute, retry: false });
  const databaseArticle = articleQuery.data ? databaseArticleToView(articleQuery.data) : null;
  const databaseArticles = publishedQuery.data?.map(databaseArticleToView);

  useEffect(() => {
    void load();
  }, [load]);

  if (initialDatabaseArticle) return <LegacyArticlePage content={initialDatabaseArticle} />;
  if (databaseArticle) return <LegacyArticlePage content={databaseArticle} />;
  if (legacy?.kind === "article") return <LegacyArticlePage content={legacy} />;
  if (archiveRoute) return <BlogArchivePage content={legacy} databaseArticles={databaseArticles} />;
  if (loading || articleQuery.isLoading) return <section className="section not-found"><div className="container"><p className="eyebrow">Loading</p><h1>Opening article…</h1></div></section>;
  if (isInitialNotFound || error || articleQuery.isError) return <section className="section not-found"><div className="container"><p className="eyebrow">404</p><h1>That page could not be found.</h1><p>The page may have moved, or the address may be incomplete.</p><Link href="/" className="button button-navy">Return Home</Link></div></section>;
  return <section className="section not-found"><div className="container"><p className="eyebrow">404</p><h1>That page could not be found.</h1><p>The page may have moved, or the address may be incomplete.</p><Link href="/" className="button button-navy">Return Home</Link></div></section>;
}

export default function LegacyContentPage({ path, initialArticle, initialNotFoundPath }: { path: string; initialArticle?: InitialPublishedArticle | null; initialNotFoundPath?: string | null }) {
  return <ClientDataProvider><LegacyContentRoute path={path} initialArticle={initialArticle} initialNotFoundPath={initialNotFoundPath} /></ClientDataProvider>;
}
