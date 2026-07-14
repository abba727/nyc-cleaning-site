import { AdminAuthShell } from "@/components/AdminAuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CmsVerificationCodeInput } from "@/components/CmsVerificationCodeInput";
import { trpc } from "@/lib/trpc";
import { CMS_PASSWORD_MIN_LENGTH, CMS_PASSWORD_REQUIREMENT, isCmsPasswordStrong } from "@shared/cmsPassword";
import { KeyRound, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

export default function AdminResetPassword() {
  const [email, setEmail] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState("");
  const reset = trpc.auth.resetPassword.useMutation();

  function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError("");
    if (!isCmsPasswordStrong(password)) {
      setLocalError(CMS_PASSWORD_REQUIREMENT);
      return;
    }
    if (password !== confirmation) {
      setLocalError("Passwords do not match.");
      return;
    }
    reset.mutate({ email, code, password });
  }

  return (
    <AdminAuthShell eyebrow="Secure reset" title="Choose a new password" description="Enter the six-digit code from your email. Codes are single-use, expire after 10 minutes, and revoke your other CMS sessions when used.">
      {reset.isSuccess ? (
        <div className="space-y-5"><p className="rounded-xl bg-emerald-50 px-4 py-4 text-sm text-emerald-800">Your password has been updated. You can now sign in with the new password.</p><Button asChild className="w-full bg-[#14846f] text-white hover:bg-[#106c5c]"><a href="/admin">Sign in</a></Button></div>
      ) : (
        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-2"><Label htmlFor="reset-email">Email address</Label><Input id="reset-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required autoFocus /></div>
          <div className="space-y-2"><Label htmlFor="reset-code">Verification code</Label><CmsVerificationCodeInput id="reset-code" value={code} onChange={setCode} describedBy="reset-code-help" /><p id="reset-code-help" className="text-xs leading-5 text-slate-500">Enter the latest code sent to this email address. You can paste all six digits at once.</p></div>
          <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={CMS_PASSWORD_MIN_LENGTH} required /><p className="text-xs leading-5 text-slate-500">{CMS_PASSWORD_REQUIREMENT}</p></div>
          <div className="space-y-2"><Label htmlFor="confirm-new-password">Confirm new password</Label><Input id="confirm-new-password" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={CMS_PASSWORD_MIN_LENGTH} required /></div>
          {localError || reset.error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{localError || reset.error?.message}</p> : null}
          <Button className="h-11 w-full bg-[#14846f] text-white hover:bg-[#106c5c]" disabled={reset.isPending}>{reset.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Update password</Button>
          <Button asChild variant="outline" className="w-full"><a href="/admin/forgot-password">Request a new code</a></Button>
        </form>
      )}
    </AdminAuthShell>
  );
}
