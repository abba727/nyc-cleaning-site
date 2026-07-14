import { Resend } from "resend";
import { ENV } from "./_core/env";

function client() {
  if (!ENV.resendApiKey) throw new Error("RESEND_API_KEY is required");
  return new Resend(ENV.resendApiKey);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

async function sendCmsEmail(input: { to: string; subject: string; heading: string; body: string; ctaLabel: string; ctaUrl: string }) {
  if (!ENV.resendFromEmail) throw new Error("RESEND_FROM_EMAIL is required");
  if (/onboarding@resend\.dev/i.test(ENV.resendFromEmail)) throw new Error("RESEND_FROM_EMAIL must use a verified production sender");
  const response = await client().emails.send({
    from: ENV.resendFromEmail,
    to: input.to,
    subject: input.subject,
    text: `${input.heading}\n\n${input.body}\n\n${input.ctaLabel}: ${input.ctaUrl}\n\nIf you did not expect this message, you can ignore it.`,
    html: `<!doctype html><html><body style="margin:0;background:#f5f7f8;font-family:Arial,sans-serif;color:#142028"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px"><tr><td style="padding:36px"><p style="margin:0 0 24px;color:#14846f;font-weight:700">NYC Cleaning</p><h1 style="margin:0 0 18px;font-size:26px">${escapeHtml(input.heading)}</h1><p style="margin:0 0 26px;line-height:1.6">${escapeHtml(input.body)}</p><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#14846f;color:#fff;text-decoration:none;padding:13px 20px;border-radius:9px;font-weight:700">${escapeHtml(input.ctaLabel)}</a><p style="margin:28px 0 0;color:#64727a;font-size:13px;line-height:1.5">If you did not expect this message, you can ignore it.</p></td></tr></table></td></tr></table></body></html>`,
  });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export function sendInvitationEmail(input: { to: string; role: "admin" | "content_manager"; setupUrl: string }) {
  const roleLabel = input.role === "admin" ? "Administrator" : "Content Manager";
  return sendCmsEmail({
    to: input.to,
    subject: "You’re invited to the NYC Cleaning CMS",
    heading: "Create your NYC Cleaning CMS account",
    body: `You were invited as ${roleLabel}. This secure invitation expires in 7 days and can be used once.`,
    ctaLabel: "Create account",
    ctaUrl: input.setupUrl,
  });
}

export function sendPasswordResetEmail(input: { to: string; resetUrl: string }) {
  return sendCmsEmail({
    to: input.to,
    subject: "Reset your NYC Cleaning CMS password",
    heading: "Reset your password",
    body: "A password reset was requested for your NYC Cleaning CMS account. This secure link expires in 60 minutes and can be used once.",
    ctaLabel: "Reset password",
    ctaUrl: input.resetUrl,
  });
}

export function sendPrimaryAdminSetupEmail(input: { to: string; setupUrl: string }) {
  return sendCmsEmail({
    to: input.to,
    subject: "Set up your NYC Cleaning CMS administrator account",
    heading: "Create your administrator password",
    body: "Use this secure, single-use link to finish setting up the primary NYC Cleaning CMS administrator account. The link expires in 7 days.",
    ctaLabel: "Set up administrator account",
    ctaUrl: input.setupUrl,
  });
}
