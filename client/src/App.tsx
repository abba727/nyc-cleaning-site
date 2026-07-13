import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ArticleAdmin from "./pages/ArticleAdmin";

function Router() {
  return (
    <Switch>
      <Route path="/admin"><DashboardLayout><ArticleAdmin /></DashboardLayout></Route>
      <Route path="/admin/articles"><DashboardLayout><ArticleAdmin /></DashboardLayout></Route>
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
