import { lazy, Suspense } from "react";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LegacyContentProvider, type LegacyContentPayload } from "./contexts/LegacyContentContext";
import Home from "./pages/Home";
import type { InitialPublishedArticle } from "./components/PublicPage";

const AdminApp = lazy(() => import("./components/AdminApp"));

function AdminLoadingState() {
  return <section className="section"><div className="container"><p className="eyebrow">Owner workspace</p><h1>Opening workspace…</h1></div></section>;
}

function Router({ initialArticle, initialNotFoundPath }: { initialArticle?: InitialPublishedArticle | null; initialNotFoundPath?: string | null }) {
  const [location] = useLocation();
  if (location.startsWith("/admin")) {
    return <Suspense fallback={<AdminLoadingState />}><AdminApp /></Suspense>;
  }
  return <div className="site-shell">
    <SiteHeader />
    <main><Home initialArticle={initialArticle} initialNotFoundPath={initialNotFoundPath} /></main>
    <SiteFooter />
  </div>;
}

function App({
  legacyContent,
  initialArticle,
  initialNotFoundPath,
}: {
  legacyContent?: LegacyContentPayload | null;
  initialArticle?: InitialPublishedArticle | null;
  initialNotFoundPath?: string | null;
}) {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><LegacyContentProvider initialPayload={legacyContent}><Router initialArticle={initialArticle} initialNotFoundPath={initialNotFoundPath} /></LegacyContentProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
