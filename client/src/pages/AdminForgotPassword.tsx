import { AdminAuthShell } from "@/components/AdminAuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Mail } from "lucide-react";
import { FormEvent, useState } from "react";

export default function AdminForgotPassword() {
  const [email, setEmail] = useState("");
  const requestReset = trpc.auth.forgotPassword.useMutation();

  function submit(event: FormEvent) {
    event.preventDefault();
    requestReset.mutate({ email });
  }

  return (
    <AdminAuthShell eyebrow="Account recovery" title="Reset your password" description="Enter your account email. If it is eligible, we will send a six-digit verification code that expires after 10 minutes.">
      {requestReset.isSuccess ? (
        <div className="space-y-5">
          <p className="rounded-xl bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800">{requestReset.data.message}</p>
          <Button asChild className="w-full bg-[#14846f] text-white hover:bg-[#106c5c]"><a href={`/admin/reset-password?email=${encodeURIComponent(email)}`}>Enter verification code</a></Button>
          <Button asChild variant="outline" className="w-full"><a href="/admin">Return to sign in</a></Button>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-2"><Label htmlFor="recovery-email">Email address</Label><Input id="recovery-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required autoFocus /></div>
          {requestReset.error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{requestReset.error.message}</p> : null}
          <Button className="h-11 w-full bg-[#14846f] text-white hover:bg-[#106c5c]" disabled={requestReset.isPending}>{requestReset.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}Send verification code</Button>
          <a className="block text-center text-sm font-semibold text-[#14846f] hover:underline" href="/admin">Back to sign in</a>
        </form>
      )}
    </AdminAuthShell>
  );
}
