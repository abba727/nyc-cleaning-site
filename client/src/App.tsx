import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Redirect, Route, Switch } from "wouter";
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import { DashboardLayoutSkeleton } from "./components/DashboardLayoutSkeleton";
import ErrorBoundary from "./components/ErrorBoundary";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ArticleAdmin from "./pages/ArticleAdmin";
import AdminForgotPassword from "./pages/AdminForgotPassword";
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";
import AdminResetPassword from "./pages/AdminResetPassword";
import AdminUsers from "./pages/AdminUsers";

function AdminEntry() {
  const { loading, user } = useAuth();
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <AdminLogin />;
  return <DashboardLayout><ArticleAdmin /></DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/admin/register"><AdminRegister /></Route>
      <Route path="/admin/forgot-password"><AdminForgotPassword /></Route>
      <Route path="/admin/reset-password"><AdminResetPassword /></Route>
      <Route path="/admin/users"><DashboardLayout><AdminUsers /></DashboardLayout></Route>
      <Route path="/admin/articles"><Redirect to="/admin" /></Route>
      <Route path="/admin"><AdminEntry /></Route>
      <Route>
        <div className="site-shell">
          <SiteHeader />
          <main><Home /></main>
          <SiteFooter />
        </div>
      </Route>
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
          <TooltipProvider>
            <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
