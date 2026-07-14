import { AdminAuthShell } from "@/components/AdminAuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { KeyRound, Loader2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

export default function AdminResetPassword() {
  const token = useMemo(
    () => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") ?? "",
    [],
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState("");
  const reset = trpc.auth.resetPassword.useMutation();

  function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError("");
    if (password !== confirmation) {
      setLocalError("Passwords do not match.");
      return;
    }
    reset.mutate({ token, password });
  }

  return (
    <AdminAuthShell eyebrow="Secure reset" title="Choose a new password" description="Reset links are single-use and expire after 60 minutes. Your other CMS sessions will be revoked.">
      {!token ? (
        <div className="space-y-5"><p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">This password-reset link is invalid.</p><Button asChild variant="outline" className="w-full"><a href="/admin/forgot-password">Request a new link</a></Button></div>
      ) : reset.isSuccess ? (
        <div className="space-y-5"><p className="rounded-xl bg-emerald-50 px-4 py-4 text-sm text-emerald-800">Your password has been updated. You can now sign in with the new password.</p><Button asChild className="w-full bg-[#14846f] text-white hover:bg-[#106c5c]"><a href="/admin">Sign in</a></Button></div>
      ) : (
        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={12} required autoFocus /><p className="text-xs leading-5 text-slate-500">At least 12 characters with uppercase, lowercase, a number, and a symbol.</p></div>
          <div className="space-y-2"><Label htmlFor="confirm-new-password">Confirm new password</Label><Input id="confirm-new-password" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={12} required /></div>
          {localError || reset.error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{localError || reset.error?.message}</p> : null}
          <Button className="h-11 w-full bg-[#14846f] text-white hover:bg-[#106c5c]" disabled={reset.isPending}>{reset.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Update password</Button>
        </form>
      )}
    </AdminAuthShell>
  );
}
