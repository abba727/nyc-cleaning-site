import { lazy, Suspense } from "react";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LegacyContentProvider, type LegacyContentPayload } from "./contexts/LegacyContentContext";
import { QuoteFormOverlayProvider } from "./components/QuoteFormOverlay";
import Home from "./pages/Home";
import ThankYou from "./pages/ThankYou";
import type { InitialPublishedArticle, LegacyContentPageRenderer } from "./components/PublicPage";

const AdminApp = lazy(() => import("./components/AdminApp"));

function AdminLoadingState() {
  return <section className="section"><div className="container"><p className="eyebrow">Owner workspace</p><h1>Opening workspace…</h1></div></section>;
}

function Router({ initialArticle, initialNotFoundPath, initialInsights, initialLegacyRenderer }: { initialArticle?: InitialPublishedArticle | null; initialNotFoundPath?: string | null; initialInsights?: InitialPublishedArticle[]; initialLegacyRenderer?: LegacyContentPageRenderer }) {
  const [location] = useLocation();
  if (location.startsWith("/admin")) {
    return <Suspense fallback={<AdminLoadingState />}><AdminApp /></Suspense>;
  }
  const isThankYou = location.replace(/\/+$/, "") === "/thank-you";
  return <QuoteFormOverlayProvider><div className="site-shell">
    <SiteHeader />
    <main>{isThankYou ? <ThankYou /> : <Home initialArticle={initialArticle} initialNotFoundPath={initialNotFoundPath} initialInsights={initialInsights} initialLegacyRenderer={initialLegacyRenderer} />}</main>
    <SiteFooter />
  </div></QuoteFormOverlayProvider>;
}

function App({
  legacyContent,
  initialArticle,
  initialNotFoundPath,
  initialInsights,
  initialLegacyRenderer,
}: {
  legacyContent?: LegacyContentPayload | null;
  initialArticle?: InitialPublishedArticle | null;
  initialNotFoundPath?: string | null;
  initialInsights?: InitialPublishedArticle[];
  initialLegacyRenderer?: LegacyContentPageRenderer;
}) {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><LegacyContentProvider initialPayload={legacyContent}><Router initialArticle={initialArticle} initialNotFoundPath={initialNotFoundPath} initialInsights={initialInsights} initialLegacyRenderer={initialLegacyRenderer} /></LegacyContentProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
