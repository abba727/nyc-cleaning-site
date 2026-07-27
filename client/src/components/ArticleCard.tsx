import { Link } from "wouter";
import { ArrowRight, CalendarDays } from "lucide-react";
import { brandAssets } from "@/content/assets";
import { getArticleCoverResponsiveMedia } from "@/content/responsive-media";

export type ArticleCardContent = {
  path: string;
  title: string;
  description: string;
  publishedAt: string | Date | null | undefined;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
};

export function formatPublicationDate(
  value: string | Date | null | undefined,
  format: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
) {
  if (!value) return null;
  const source = value instanceof Date ? value : /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value;
  const date = source instanceof Date ? source : new Date(source);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { ...format, timeZone: "UTC" }).format(date);
}

function ArticleCardImage({ article }: { article: ArticleCardContent }) {
  const image = article.coverImageUrl || brandAssets.commercialCleaning;
  const alt = article.coverImageAlt || `NYC Cleaning insight: ${article.title}`;
  const responsiveMedia = getArticleCoverResponsiveMedia(image);

  if (!responsiveMedia) {
    return <img src={image} alt={alt} width={1200} height={800} loading="lazy" fetchPriority="low" decoding="async" />;
  }

  return <picture className="responsive-picture">
    <source type="image/avif" srcSet={responsiveMedia.avifSrcSet} sizes={responsiveMedia.sizes} />
    <source type="image/webp" srcSet={responsiveMedia.fallbackSrcSet} sizes={responsiveMedia.sizes} />
    <img src={image} srcSet={responsiveMedia.fallbackSrcSet} sizes={responsiveMedia.sizes} alt={alt} width={1200} height={800} loading="lazy" fetchPriority="low" decoding="async" />
  </picture>;
}

export function ArticleCard({ article }: { article: ArticleCardContent }) {
  const publishedDate = formatPublicationDate(article.publishedAt);
  const articleTitle = article.title.replace(/\s*[|–-]\s*NYC Cleaning.*$/i, "");

  return (
    <article className="article-card">
      <Link href={article.path} className="article-card-image" aria-label={`Read ${articleTitle}`}>
        <ArticleCardImage article={article} />
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
