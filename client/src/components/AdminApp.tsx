import { lazy, Suspense, type ReactNode } from "react";
import { Redirect, Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { ClientDataProvider } from "./ClientDataProvider";

const DashboardLayout = lazy(() => import("./DashboardLayout"));
const ArticleAdmin = lazy(() => import("@/pages/ArticleAdmin"));
const AdminForgotPassword = lazy(() => import("@/pages/AdminForgotPassword"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminRegister = lazy(() => import("@/pages/AdminRegister"));
const AdminResetPassword = lazy(() => import("@/pages/AdminResetPassword"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const AdminInquiries = lazy(() => import("@/pages/AdminInquiries"));

function AdminLoadingBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<DashboardLayoutSkeleton />}>{children}</Suspense>;
}

function AdminEntry() {
  const { loading, user } = useAuth();
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <AdminLoadingBoundary><AdminLogin /></AdminLoadingBoundary>;
  return <AdminLoadingBoundary><DashboardLayout><ArticleAdmin /></DashboardLayout></AdminLoadingBoundary>;
}

function AdminRoutes() {
  return <Switch>
    <Route path="/admin/register"><AdminLoadingBoundary><AdminRegister /></AdminLoadingBoundary></Route>
    <Route path="/admin/forgot-password"><AdminLoadingBoundary><AdminForgotPassword /></AdminLoadingBoundary></Route>
    <Route path="/admin/reset-password"><AdminLoadingBoundary><AdminResetPassword /></AdminLoadingBoundary></Route>
    <Route path="/admin/users"><AdminLoadingBoundary><DashboardLayout><AdminUsers /></DashboardLayout></AdminLoadingBoundary></Route>
    <Route path="/admin/inquiries"><AdminLoadingBoundary><DashboardLayout><AdminInquiries /></DashboardLayout></AdminLoadingBoundary></Route>
    <Route path="/admin/articles"><Redirect to="/admin" /></Route>
    <Route path="/admin"><AdminEntry /></Route>
  </Switch>;
}

export default function AdminApp() {
  return <ClientDataProvider><TooltipProvider><Toaster /><AdminRoutes /></TooltipProvider></ClientDataProvider>;
}
