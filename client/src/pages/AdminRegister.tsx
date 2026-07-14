import { AdminAuthShell } from "@/components/AdminAuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

export default function AdminRegister() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
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
    register.mutate({ email, code, name, password });
  }

  return (
    <AdminAuthShell eyebrow="Invitation" title="Create your CMS account" description="Enter the six-digit code from your invitation email. Codes are single-use and expire after 10 minutes.">
      <form className="space-y-5" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email address</Label>
          <Input id="invite-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-code">Verification code</Label>
          <Input id="invite-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="font-mono text-lg tracking-[0.3em]" aria-describedby="invite-code-help" required />
          <p id="invite-code-help" className="text-xs leading-5 text-slate-500">Use the latest code sent to this email address.</p>
        </div>
        <div className="space-y-2"><Label htmlFor="invite-name">Full name</Label><Input id="invite-name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} minLength={2} required /></div>
        <div className="space-y-2"><Label htmlFor="invite-password">Password</Label><Input id="invite-password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={12} required /><p className="text-xs leading-5 text-slate-500">At least 12 characters with uppercase, lowercase, a number, and a symbol.</p></div>
        <div className="space-y-2"><Label htmlFor="invite-confirmation">Confirm password</Label><Input id="invite-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={12} required /></div>
        {localError || register.error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{localError || register.error?.message}</p> : null}
        <Button className="h-11 w-full bg-[#14846f] text-white hover:bg-[#106c5c]" disabled={register.isPending}>{register.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}Create account</Button>
        <Button asChild variant="outline" className="w-full"><a href="/admin">Return to sign in</a></Button>
      </form>
    </AdminAuthShell>
  );
}
