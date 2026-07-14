import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Clock3, Loader2, MailPlus, RefreshCw, ShieldCheck, Trash2, UserRoundCog } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type CmsRole = "admin" | "content_manager";
const roleLabel = (role: string) => role === "admin" ? "Admin" : "Content Manager";
const formatDate = (value: Date | string | null) => value ? new Date(value).toLocaleString() : "Never";

export default function AdminUsers() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CmsRole>("content_manager");
  const directory = trpc.cmsUsers.list.useQuery(undefined, { enabled: user?.role === "admin", retry: false });

  useEffect(() => {
    if (user && user.role !== "admin") setLocation("/admin");
  }, [setLocation, user]);

  const refresh = async () => { await utils.cmsUsers.list.invalidate(); };
  const invite = trpc.cmsUsers.invite.useMutation({ onSuccess: async () => { setEmail(""); setRole("content_manager"); await refresh(); toast.success("Invitation sent."); } });
  const resend = trpc.cmsUsers.resendInvitation.useMutation({ onSuccess: async () => { await refresh(); toast.success("A new invitation link was sent."); } });
  const revoke = trpc.cmsUsers.revokeInvitation.useMutation({ onSuccess: async () => { await refresh(); toast.success("Invitation revoked."); } });
  const changeRole = trpc.cmsUsers.changeRole.useMutation({ onSuccess: async () => { await refresh(); toast.success("Permissions updated. Existing sessions were revoked."); } });
  const remove = trpc.cmsUsers.remove.useMutation({ onSuccess: async () => { await refresh(); toast.success("User access removed."); } });

  function submitInvitation(event: FormEvent) {
    event.preventDefault();
    invite.mutate({ email, role });
  }

  function removeUser(userId: number, name: string | null) {
    if (window.confirm(`Remove CMS access for ${name || "this user"}? Their active sessions will be revoked.`)) remove.mutate({ userId });
  }

  if (user?.role !== "admin") return null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-1 sm:p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#14846f]">Administration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">CMS users</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Invite team members and control who can manage users versus edit articles.</p></div>
        <Button variant="outline" onClick={() => void directory.refetch()} disabled={directory.isFetching}><RefreshCw className={`h-4 w-4 ${directory.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
      </header>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MailPlus className="h-5 w-5 text-[#14846f]" />Invite a user</CardTitle><CardDescription>Invitations expire after seven days and can be used once.</CardDescription></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[minmax(280px,1fr)_220px_180px] md:items-end" onSubmit={submitInvitation}>
            <div className="grid gap-2"><Label className="flex min-h-5 items-center" htmlFor="invite-user-email">Email address</Label><Input className="h-11 bg-white" id="invite-user-email" type="email" value={email} onChange={event => setEmail(event.target.value)} required /></div>
            <div className="grid gap-2"><Label className="flex min-h-5 items-center" htmlFor="invite-user-role">Role</Label><Select value={role} onValueChange={value => setRole(value as CmsRole)}><SelectTrigger className="w-full data-[size=default]:h-11" id="invite-user-role"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="content_manager">Content Manager</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>
            <Button className="h-11 w-full bg-[#14846f] text-white hover:bg-[#106c5c]" disabled={invite.isPending}>{invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}Send invitation</Button>
          </form>
          {invite.error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{invite.error.message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserRoundCog className="h-5 w-5 text-[#14846f]" />Active users</CardTitle><CardDescription>Admins have full CMS and user-management access. Content Managers can manage articles only.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {directory.isLoading ? <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading users…</div> : directory.error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{directory.error.message}</p> : directory.data?.users.map(account => (
            <div key={account.id} className="grid gap-4 rounded-2xl border p-4 md:grid-cols-[minmax(220px,1fr)_180px_190px_auto] md:items-center">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">{account.name || "Unnamed user"}</p>{account.isPrimaryAdmin ? <Badge className="bg-[#e2f5ef] text-[#106c5c] hover:bg-[#e2f5ef]"><ShieldCheck className="mr-1 h-3 w-3" />Primary admin</Badge> : null}{account.id === user.id ? <Badge variant="outline">You</Badge> : null}</div><p className="mt-1 truncate text-sm text-muted-foreground">{account.email}</p></div>
              <Select value={account.role as CmsRole} disabled={Boolean(account.isPrimaryAdmin) || changeRole.isPending} onValueChange={value => changeRole.mutate({ userId: account.id, role: value as CmsRole })}><SelectTrigger aria-label={`Role for ${account.email}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="content_manager">Content Manager</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select>
              <div className="text-xs leading-5 text-muted-foreground"><span className="block font-medium text-foreground">Last signed in</span>{formatDate(account.lastSignedInAt)}</div>
              <Button variant="ghost" size="sm" className="justify-self-start text-destructive hover:text-destructive md:justify-self-end" disabled={Boolean(account.isPrimaryAdmin) || account.id === user.id || remove.isPending} onClick={() => removeUser(account.id, account.name)}><Trash2 className="h-4 w-4" />Remove</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-[#14846f]" />Pending invitations</CardTitle><CardDescription>Resending revokes the prior link and creates a new seven-day invitation.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {!directory.isLoading && directory.data?.invitations.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">There are no pending invitations.</p> : directory.data?.invitations.map(invitation => (
            <div key={invitation.id} className="flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{invitation.email}</p><Badge variant="secondary">{roleLabel(invitation.role)}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Expires {formatDate(invitation.expiresAt)}</p></div>
              <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={resend.isPending} onClick={() => resend.mutate({ invitationId: invitation.id })}><RefreshCw className="h-4 w-4" />Resend</Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={revoke.isPending} onClick={() => revoke.mutate({ invitationId: invitation.id })}><Trash2 className="h-4 w-4" />Revoke</Button></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
