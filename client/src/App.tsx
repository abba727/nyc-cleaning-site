import { lazy, Suspense } from "react";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LegacyContentProvider, type LegacyContentPayload } from "./contexts/LegacyContentContext";
import Home from "./pages/Home";

const AdminApp = lazy(() => import("./components/AdminApp"));

function AdminLoadingState() {
  return <section className="section"><div className="container"><p className="eyebrow">Owner workspace</p><h1>Opening workspace…</h1></div></section>;
}

function Router() {
  const [location] = useLocation();
  if (location.startsWith("/admin")) {
    return <Suspense fallback={<AdminLoadingState />}><AdminApp /></Suspense>;
  }
  return <div className="site-shell">
    <SiteHeader />
    <main><Home /></main>
    <SiteFooter />
  </div>;
}

function App({ legacyContent }: { legacyContent?: LegacyContentPayload | null }) {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><LegacyContentProvider initialPayload={legacyContent}><Router /></LegacyContentProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
