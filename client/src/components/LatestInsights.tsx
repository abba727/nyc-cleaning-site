import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArticleCard, type ArticleCardContent } from "./ArticleCard";

type LatestInsightsProps = {
  initialInsights?: ArticleCardContent[];
};

type LatestInsightsResponse = {
  insights?: ArticleCardContent[];
};

/**
 * Homepage insight cards deliberately load outside the critical rendering path.
 * The server sends the structural, crawlable page immediately, then this small
 * client chunk requests only the three cards visible on the homepage.
 */
export default function LatestInsights({ initialInsights = [] }: LatestInsightsProps) {
  const [insights, setInsights] = useState(() => initialInsights.slice(0, 3));

  useEffect(() => {
    if (initialInsights.length > 0) return;

    const controller = new AbortController();
    void fetch("/api/homepage-insights", { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(`Homepage insights request failed (${response.status})`);
        return response.json() as Promise<LatestInsightsResponse>;
      })
      .then(payload => {
        if (Array.isArray(payload.insights)) setInsights(payload.insights.slice(0, 3));
      })
      .catch(error => {
        if (error.name !== "AbortError") console.warn("[Insights] Homepage cards could not be loaded", error);
      });

    return () => controller.abort();
  }, [initialInsights]);

  if (insights.length === 0) return null;

  return (
    <section className="section section-cream">
      <div className="container">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Property insights</p>
            <h2>The latest guidance from our team.</h2>
          </div>
          <p>Practical strategies and property-care insights designed to help New York property managers and facility teams.</p>
        </div>
        <div className="article-grid">
          {insights.map(article => <ArticleCard key={article.path} article={article} />)}
        </div>
        <div className="center-action" style={{ marginTop: "clamp(2rem, 4vw, 3.25rem)" }}>
          <Link href="/blog/" className="button button-navy">View All Insights</Link>
        </div>
      </div>
    </section>
  );
}
