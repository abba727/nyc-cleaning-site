import { useEffect, useMemo, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, CalendarDays, ShieldCheck } from "lucide-react";
import { company, isBlogArchivePath, normalizePath, siteOrigin, type LegacyContent } from "@/content/site";
import { useLegacyContent } from "@/contexts/LegacyContentContext";
import { ClientDataProvider } from "./ClientDataProvider";
import { trpc } from "@/lib/trpc";
import type { InitialPublishedArticle } from "./PublicPage";

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

function ArticleImage({ content }: { content: ArticleView }) {
  const { payload } = useLegacyContent();
  const image = content.coverImageUrl || payload?.images[normalizePath(content.path)]?.src;
  const alt = content.coverImageAlt || payload?.images[normalizePath(content.path)]?.alt || `Editorial image for ${content.title}`;
  return image ? <img src={image} alt={alt} loading="lazy" decoding="async" /> : null;
}

function LegacyArticlePage({ content }: { content: ArticleView }) {
  return <>
    <ClientLegacyHead content={content} />
    <section className="article-hero"><div className="container article-hero-inner"><div><p className="eyebrow light">NYC cleaning insights</p><h1>{content.title.replace(/\s*[|–-]\s*NYC Cleaning.*$/i, "")}</h1>{content.publishedAt && <p className="article-date"><CalendarDays size={18} aria-hidden="true" />{new Date(`${content.publishedAt}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</p>}</div><ArticleImage content={content} /></div></section>
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
  const { payload } = useLegacyContent();
  const locationPath = content?.path || "/blog/";
  const isMonthlyArchive = content?.kind === "archive";
  const staticArticles = payload?.content.filter(item => item.kind === "article") || [];
  const staticArchives = payload?.content.filter(item => item.kind === "archive") || [];
  const articles = databaseArticles?.length
    ? (isMonthlyArchive
      ? databaseArticles.filter(article => article.publishedAt.startsWith(locationPath.slice(1, 8).replace("/", "-")))
      : databaseArticles.slice(0, 12))
    : (isMonthlyArchive
      ? staticArticles.filter(article => article.publishedAt.startsWith(locationPath.slice(1, 8).replace("/", "-")))
      : [...staticArticles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 12));
  const monthArchives = [...staticArchives].sort((a, b) => b.path.localeCompare(a.path));
  const title = content?.title.replace(/\s*[|–-]\s*NYC Cleaning.*$/i, "") || "Cleaning and Property Maintenance Insights";
  return <>
    <ClientLegacyHead content={content} />
    <section className="interior-hero legal"><div className="container interior-hero-grid"><div><p className="eyebrow light">NYC Cleaning and Maintenance</p><h1>{title}</h1><p>Source-preserved guidance for commercial, residential, mixed-use, and office properties across New York City.</p></div></div></section>
    <section className="section"><div className="container"><div className="section-heading split"><div><p className="eyebrow">{isMonthlyArchive ? "Archive" : "Latest guidance"}</p><h2>{isMonthlyArchive ? title : "Recent cleaning and property-care articles."}</h2></div><p>{isMonthlyArchive ? "Browse articles published during this month." : "Start with the latest practical guidance, or use the monthly archive to explore the complete collection."}</p></div><div className="article-grid">{articles.map(article => <article className="article-card" key={article.path}><Link href={article.path} className="article-card-image"><ArticleImage content={article} /></Link><div className="article-card-body"><p className="eyebrow">Cleaning insights</p><h2><Link href={article.path}>{article.title.replace(/\s*[|–-]\s*NYC Cleaning.*$/i, "")}</Link></h2><p>{article.description}</p><Link href={article.path} className="text-link">Read article <ArrowRight size={16} aria-hidden="true" /></Link></div></article>)}</div></div></section>
    {!isMonthlyArchive && <section className="section section-cream"><div className="container archive-browser"><div><p className="eyebrow">Complete archive</p><h2>Browse insights by month.</h2><p>All preserved articles remain available at their original URLs and can now be managed from the owner workspace.</p></div><div className="archive-months">{monthArchives.map(archive => <Link href={archive.path} key={archive.path}>{archiveLabel(archive.path)}<ArrowRight size={15} aria-hidden="true" /></Link>)}</div></div></section>}
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
