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

function lines(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function requireProductionSender() {
  if (!ENV.resendFromEmail) throw new Error("RESEND_FROM_EMAIL is required");
  if (/onboarding@resend\.dev/i.test(ENV.resendFromEmail)) throw new Error("RESEND_FROM_EMAIL must use a verified production sender");
  return ENV.resendFromEmail;
}

async function sendCmsCodeEmail(input: { to: string; subject: string; heading: string; body: string; code: string }) {
  const response = await client().emails.send({
    from: requireProductionSender(),
    to: input.to,
    subject: input.subject,
    text: `${input.heading}\n\n${input.body}\n\nYour verification code is: ${input.code}\n\nThis code expires in 10 minutes and can be used once. If you did not expect this message, you can ignore it.`,
    html: `<!doctype html><html><body style="margin:0;background:#f5f7f8;font-family:Arial,sans-serif;color:#142028"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px"><tr><td style="padding:36px"><p style="margin:0 0 24px;color:#14846f;font-weight:700">NYC Cleaning</p><h1 style="margin:0 0 18px;font-size:26px">${escapeHtml(input.heading)}</h1><p style="margin:0 0 22px;line-height:1.6">${escapeHtml(input.body)}</p><p style="margin:0 0 10px;color:#64727a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Your verification code</p><div style="display:inline-block;background:#eef7f5;border:1px solid #c6e6df;border-radius:12px;padding:16px 22px;color:#0d6657;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:800;letter-spacing:.22em">${escapeHtml(input.code)}</div><p style="margin:22px 0 0;color:#64727a;font-size:13px;line-height:1.5">This code expires in 10 minutes and can be used once. If you did not expect this message, you can ignore it.</p></td></tr></table></td></tr></table></body></html>`,
  });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export async function sendInquiryNotification(input: {
  inquiryId: number;
  inquiryType: "contact" | "quote";
  name: string;
  email: string;
  phone: string;
  serviceType: string;
  message: string;
  sourcePath: string;
}) {
  const response = await client().emails.send({
    from: requireProductionSender(),
    to: "info@fcmre.com",
    replyTo: input.email,
    subject: `New ${input.inquiryType === "quote" ? "quote request" : "contact inquiry"} #${input.inquiryId} from ${input.name}`,
    text: `New website inquiry #${input.inquiryId}\n\nName: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone}\nService: ${input.serviceType}\nSource: ${input.sourcePath}\n\nMessage:\n${input.message}`,
    html: `<!doctype html><html><body style="margin:0;background:#f5f7f8;font-family:Arial,sans-serif;color:#142028"><table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:640px;background:#fff;border-radius:16px"><tr><td style="padding:36px"><p style="margin:0 0 20px;color:#14846f;font-weight:700">NYC Cleaning website inquiry</p><h1 style="margin:0 0 22px;font-size:26px">${escapeHtml(input.name)} requested ${input.inquiryType === "quote" ? "a quote" : "contact"}</h1><table role="presentation" width="100%" style="border-collapse:collapse"><tr><td style="padding:8px 0;color:#64727a">Inquiry</td><td style="padding:8px 0;font-weight:700">#${input.inquiryId}</td></tr><tr><td style="padding:8px 0;color:#64727a">Email</td><td style="padding:8px 0"><a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></td></tr><tr><td style="padding:8px 0;color:#64727a">Phone</td><td style="padding:8px 0">${escapeHtml(input.phone)}</td></tr><tr><td style="padding:8px 0;color:#64727a">Service</td><td style="padding:8px 0">${escapeHtml(input.serviceType)}</td></tr><tr><td style="padding:8px 0;color:#64727a">Source</td><td style="padding:8px 0">${escapeHtml(input.sourcePath)}</td></tr></table><div style="margin-top:24px;padding:20px;background:#eef7f5;border-radius:12px;line-height:1.65">${lines(input.message)}</div><p style="margin:22px 0 0;color:#64727a;font-size:13px">Reply to this email to contact ${escapeHtml(input.name)}, or respond from the NYC Cleaning CMS.</p></td></tr></table></td></tr></table></body></html>`,
  });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export async function sendInquiryReply(input: { to: string; customerName: string; subject: string; message: string }) {
  const response = await client().emails.send({
    from: requireProductionSender(),
    to: input.to,
    replyTo: "info@nyccleaning.co",
    subject: input.subject,
    text: `Hello ${input.customerName},\n\n${input.message}\n\nNYC Cleaning and Maintenance\ninfo@nyccleaning.co`,
    html: `<!doctype html><html><body style="margin:0;background:#f5f7f8;font-family:Arial,sans-serif;color:#142028"><table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:640px;background:#fff;border-radius:16px"><tr><td style="padding:36px"><p style="margin:0 0 24px;color:#14846f;font-weight:700">NYC Cleaning and Maintenance</p><p style="margin:0 0 18px;line-height:1.65">Hello ${escapeHtml(input.customerName)},</p><div style="line-height:1.65">${lines(input.message)}</div><p style="margin:28px 0 0;color:#64727a;line-height:1.6">NYC Cleaning and Maintenance<br /><a href="mailto:info@nyccleaning.co">info@nyccleaning.co</a></p></td></tr></table></td></tr></table></body></html>`,
  });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export function sendInvitationEmail(input: { to: string; role: "admin" | "content_manager"; code: string }) {
  const roleLabel = input.role === "admin" ? "Administrator" : "Content Manager";
  return sendCmsCodeEmail({
    to: input.to,
    subject: "You’re invited to the NYC Cleaning CMS",
    heading: "Create your NYC Cleaning CMS account",
    body: `You were invited as ${roleLabel}. Enter the code below with your email address on the CMS registration screen.`,
    code: input.code,
  });
}

export function sendPasswordResetEmail(input: { to: string; code: string }) {
  return sendCmsCodeEmail({
    to: input.to,
    subject: "Reset your NYC Cleaning CMS password",
    heading: "Reset your password",
    body: "A password reset was requested for your NYC Cleaning CMS account. Enter the code below on the password-reset screen.",
    code: input.code,
  });
}

export function sendPrimaryAdminSetupEmail(input: { to: string; code: string }) {
  return sendCmsCodeEmail({
    to: input.to,
    subject: "Set up your NYC Cleaning CMS administrator account",
    heading: "Create your administrator password",
    body: "Enter the code below with your email address on the CMS registration screen to finish setting up the primary administrator account.",
    code: input.code,
  });
}
