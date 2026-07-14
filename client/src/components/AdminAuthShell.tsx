import type { ReactNode } from "react";

export function AdminAuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f3f7f6] text-slate-950 lg:grid lg:grid-cols-[minmax(320px,0.85fr)_minmax(520px,1.15fr)]">
      <section className="relative hidden overflow-hidden bg-[#102f35] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#22a98b]/20 blur-3xl" />
        <div className="relative">
          <a href="/" className="inline-flex items-center gap-3 text-sm font-semibold tracking-wide">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22a98b] text-lg">N</span>
            NYC Cleaning CMS
          </a>
        </div>
        <div className="relative max-w-md">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-[#82d7c5]">Private workspace</p>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Publish useful cleaning guidance with a secure, focused editorial workflow.</h2>
          <p className="mt-6 max-w-sm text-sm leading-7 text-slate-300">Access is invitation-only. Account permissions are managed by NYC Cleaning administrators.</p>
        </div>
        <p className="relative text-xs text-slate-400">NYC Cleaning · New York City</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <a href="/" className="mb-10 inline-flex items-center gap-3 text-sm font-semibold text-[#12383d] lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#14846f] text-white">N</span>
            NYC Cleaning CMS
          </a>
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_rgba(23,54,59,0.10)] sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#14846f]">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102f35]">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">Need help accessing the CMS? Contact your NYC Cleaning administrator.</p>
        </div>
      </section>
    </main>
  );
}
