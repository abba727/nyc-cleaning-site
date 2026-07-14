type DashboardIdentity = {
  role?: string | null;
} | null;

export function getDashboardAccessState(loading: boolean, user: DashboardIdentity) {
  if (loading) return "loading" as const;
  if (!user) return "signed-out" as const;
  if (user.role !== "admin" && user.role !== "content_manager") return "denied" as const;
  return "allowed" as const;
}
