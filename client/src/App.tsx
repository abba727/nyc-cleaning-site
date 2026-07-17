import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Redirect, Route, Switch } from "wouter";
import { useAuth } from "./_core/hooks/useAuth";
import { DashboardLayoutSkeleton } from "./components/DashboardLayoutSkeleton";
import ErrorBoundary from "./components/ErrorBoundary";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import type { InitialPublishedArticle } from "./components/PublicPage";

const DashboardLayout = lazy(() => import("./components/DashboardLayout"));
const ArticleAdmin = lazy(() => import("./pages/ArticleAdmin"));
const AdminForgotPassword = lazy(() => import("./pages/AdminForgotPassword"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminRegister = lazy(() => import("./pages/AdminRegister"));
const AdminResetPassword = lazy(() => import("./pages/AdminResetPassword"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminInquiries = lazy(() => import("./pages/AdminInquiries"));

function AdminEntry() {
  const { loading, user } = useAuth();
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <AdminLogin />;
  return <DashboardLayout><ArticleAdmin /></DashboardLayout>;
}

function Router({ initialArticle, initialNotFoundPath }: { initialArticle?: InitialPublishedArticle | null; initialNotFoundPath?: string | null }) {
  return (
    <Suspense fallback={<DashboardLayoutSkeleton />}>
      <Switch>
        <Route path="/admin/register"><AdminRegister /></Route>
        <Route path="/admin/forgot-password"><AdminForgotPassword /></Route>
        <Route path="/admin/reset-password"><AdminResetPassword /></Route>
        <Route path="/admin/users"><DashboardLayout><AdminUsers /></DashboardLayout></Route>
        <Route path="/admin/inquiries"><DashboardLayout><AdminInquiries /></DashboardLayout></Route>
        <Route path="/admin/articles"><Redirect to="/admin" /></Route>
        <Route path="/admin"><AdminEntry /></Route>
        <Route>
          <div className="site-shell">
            <SiteHeader />
            <main><Home initialArticle={initialArticle} initialNotFoundPath={initialNotFoundPath} /></main>
            <SiteFooter />
          </div>
        </Route>
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App({ initialArticle, initialNotFoundPath }: { initialArticle?: InitialPublishedArticle | null; initialNotFoundPath?: string | null }) {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
          <TooltipProvider>
            <Toaster />
          <Router initialArticle={initialArticle} initialNotFoundPath={initialNotFoundPath} />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
