import { AdminAuthShell } from "@/components/AdminAuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, UserPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useLocation } from "wouter";

export default function AdminRegister() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const token = useMemo(
    () => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") ?? "",
    [],
  );
  const invitation = trpc.auth.invitation.useQuery({ token }, { enabled: token.length >= 32, retry: false });
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState("");
  const register = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLocation("/admin");
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError("");
    if (password !== confirmation) {
      setLocalError("Passwords do not match.");
      return;
    }
    register.mutate({ token, name, password });
  }

  const roleLabel = invitation.data?.role === "admin" ? "Admin" : "Content Manager";

  return (
    <AdminAuthShell eyebrow="Invitation" title="Create your CMS account" description="Complete your secure account setup. Invitations are single-use and expire after seven days.">
      {!token || invitation.error ? (
        <div className="space-y-5">
          <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">This invitation is invalid or has expired. Ask an administrator to send a new invitation.</p>
          <Button asChild variant="outline" className="w-full"><a href="/admin">Return to sign in</a></Button>
        </div>
      ) : invitation.isLoading ? (
        <div className="flex items-center gap-3 py-8 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Validating invitation…</div>
      ) : (
        <form className="space-y-5" onSubmit={submit}>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <strong>{invitation.data?.email}</strong><span className="mt-1 block text-xs text-emerald-700">Role: {roleLabel}</span>
          </div>
          <div className="space-y-2"><Label htmlFor="invite-name">Full name</Label><Input id="invite-name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} minLength={2} required autoFocus /></div>
          <div className="space-y-2"><Label htmlFor="invite-password">Password</Label><Input id="invite-password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={12} required /><p className="text-xs leading-5 text-slate-500">At least 12 characters with uppercase, lowercase, a number, and a symbol.</p></div>
          <div className="space-y-2"><Label htmlFor="invite-confirmation">Confirm password</Label><Input id="invite-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={12} required /></div>
          {localError || register.error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{localError || register.error?.message}</p> : null}
          <Button className="h-11 w-full bg-[#14846f] text-white hover:bg-[#106c5c]" disabled={register.isPending}>{register.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}Create account</Button>
        </form>
      )}
    </AdminAuthShell>
  );
}
