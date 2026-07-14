import { AdminAuthShell } from "@/components/AdminAuthShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";

export default function AdminLogin() {
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      setSessionError(null);
      try {
        await utils.auth.me.invalidate();
        const user = await utils.auth.me.fetch();
        if (!user) {
          setSessionError("Your password was accepted, but the secure session could not be started. Please allow cookies for this site and try again.");
          return;
        }

        utils.auth.me.setData(undefined, user);
        window.location.replace("/admin");
      } catch {
        setSessionError("Your password was accepted, but the dashboard could not be opened. Please try again.");
      }
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setSessionError(null);
    login.mutate({ email, password, rememberMe });
  }

  return (
    <AdminAuthShell eyebrow="Secure sign in" title="Welcome back" description="Use the email address and password associated with your invitation-only CMS account.">
      <form className="space-y-5" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="cms-email">Email address</Label>
          <Input id="cms-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required autoFocus />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="cms-password">Password</Label>
            <a className="text-xs font-semibold text-[#14846f] hover:underline" href="/admin/forgot-password">Forgot password?</a>
          </div>
          <Input id="cms-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600">
          <Checkbox checked={rememberMe} onCheckedChange={value => setRememberMe(value === true)} />
          Keep me signed in for 30 days
        </label>
        {login.error || sessionError ? <p role="alert" aria-live="assertive" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sessionError ?? login.error?.message}</p> : null}
        <Button type="submit" aria-busy={login.isPending} className="h-11 w-full bg-[#14846f] text-white hover:bg-[#106c5c]" disabled={login.isPending}>
          {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AdminAuthShell>
  );
}
