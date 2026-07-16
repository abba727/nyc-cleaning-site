import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { CMS_PASSWORD_MIN_LENGTH, CMS_PASSWORD_REQUIREMENT } from "@shared/cmsPassword";
import { countRecentInquiriesByEmail, createArticle, createInquiry, createInquiryResponse, deleteArticle, getInquiryById, getPublishedArticleByPath, listAllArticles, listInquiries, listPublishedArticles, markInquiryResponded, updateArticle, updateInquiryNotificationStatus, updateInquiryResponseDelivery, updateInquiryStatus } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { generateImage } from "./_core/imageGeneration";
import { systemRouter } from "./_core/systemRouter";
import { accountAdminProcedure, adminProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import {
  createCmsSessionToken,
  hashPassword,
  isStrongPassword,
  normalizeEmail,
  REMEMBER_SESSION_MS,
  SHORT_SESSION_MS,
  verifyPassword,
} from "./cmsAuth";
import {
  acceptInvitation,
  changeCmsUserRole,
  completePasswordReset,
  createInvitation,
  createPasswordReset,
  createPrimaryAdminSetup,
  getCredentialByEmail,
  listCmsUsersAndInvitations,
  recordLoginResult,
  removeCmsUser,
  revokeCmsUserSessions,
  revokeInvitation,
} from "./cmsDb";
import { sendInquiryNotification, sendInquiryReply, sendInvitationEmail, sendPasswordResetEmail, sendPrimaryAdminSetupEmail } from "./cmsEmail";

const inquiryInput = z.object({
  inquiryType: z.enum(["contact", "quote"]).default("quote"),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().email().max(320),
  phone: z
    .string()
    .trim()
    .min(10)
    .max(24)
    .refine(value => {
      const digits = value.replace(/\D/g, "");
      return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
    }, "Enter a valid 10-digit US phone number"),
  serviceType: z.string().trim().min(2).max(160),
  message: z.string().trim().min(10).max(5000),
  sourcePath: z.string().trim().max(512).default("/contact/"),
  website: z.string().max(0).optional(),
});

function normalizeUsPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

function displayUsPhone(value: string) {
  const digits = normalizeUsPhone(value);
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const articleBlockInput = z.object({
  type: z.enum(["h2", "h3", "p", "li"]),
  text: z.string().trim().min(1).max(10000),
});

const normalizedArticlePath = z.string().trim().min(3).max(512).transform(value => {
  const clean = `/${value}`.replace(/\/+/g, "/").replace(/\/$/, "");
  return `${clean}/`;
});

const articleCoverUrl = z.string().trim().min(1).max(4000).refine(value => {
  if (value.startsWith("/manus-storage/")) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, "Enter a secure image URL or upload an image.");

const articleInput = z.object({
  path: normalizedArticlePath,
  slug: z.string().trim().min(2).max(512).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens."),
  title: z.string().trim().min(5).max(512),
  excerpt: z.string().trim().min(20).max(4000),
  body: z.array(articleBlockInput).min(1).max(300),
  seoTitle: z.string().trim().min(3).max(512),
  metaDescription: z.string().trim().min(20).max(4000),
  authorName: z.string().trim().min(2).max(255),
  coverImageUrl: articleCoverUrl,
  coverImageKey: z.string().trim().max(1000).nullable().optional(),
  coverImageAlt: z.string().trim().min(5).max(512),
  sourceUrl: z.union([z.string().trim().url().max(4000), z.literal("")]).optional(),
  status: z.enum(["draft", "published"]),
  publishedAt: z.coerce.date().nullable().optional(),
});

const cmsRole = z.enum(["admin", "content_manager"]);
const emailInput = z.string().trim().toLowerCase().email().max(320);
const passwordInput = z.string().min(CMS_PASSWORD_MIN_LENGTH).max(128);
const verificationCodeInput = z.string().regex(/^\d{6}$/, "Enter the six-digit code.");
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
let dummyPasswordHash: Promise<string> | null = null;

function loginAttemptKey(email: string, ip?: string) {
  return `${normalizeEmail(email)}:${ip || "unknown"}`;
}

function enforceLoginThrottle(key: string) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (entry && entry.resetAt > now && entry.count >= 7) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please wait 15 minutes and try again." });
  }
  if (entry && entry.resetAt <= now) loginAttempts.delete(key);
}

function recordLoginFailure(key: string) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  loginAttempts.set(key, entry && entry.resetAt > now
    ? { ...entry, count: entry.count + 1 }
    : { count: 1, resetAt: now + 15 * 60 * 1000 });
}

function setCmsSessionCookie(ctx: { req: any; res: any }, token: string, rememberMe: boolean) {
  ctx.res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: rememberMe ? REMEMBER_SESSION_MS : SHORT_SESSION_MS,
  });
}

function accountError(error: unknown): never {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const known: Record<string, string> = {
    USER_ALREADY_ACTIVE: "An active user already exists with that email address.",
    PRIMARY_ADMIN_PROTECTED: "The primary administrator cannot be changed or removed.",
    USER_NOT_FOUND: "The selected user was not found.",
    INVITATION_NOT_FOUND: "The invitation is no longer available.",
    CODE_RESEND_COOLDOWN: "Please wait one minute before requesting another code.",
  };
  throw new TRPCError({
    code: message === "CODE_RESEND_COOLDOWN" ? "TOO_MANY_REQUESTS" : message === "USER_NOT_FOUND" || message === "INVITATION_NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST",
    message: known[message] || "The request could not be completed.",
  });
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure.input(z.object({
      email: emailInput,
      password: z.string().min(1).max(128),
      rememberMe: z.boolean().default(false),
    })).mutation(async ({ input, ctx }) => {
      const email = normalizeEmail(input.email);
      const key = loginAttemptKey(email, ctx.req.ip);
      enforceLoginThrottle(key);
      const credential = await getCredentialByEmail(email);
      const fallback = dummyPasswordHash ??= hashPassword("Not a real account password 9284!");
      const passwordValid = await verifyPassword(credential?.passwordHash || await fallback, input.password);
      const allowed = Boolean(credential && !credential.deletedAt && credential.status === "active" && credential.passwordHash && passwordValid && (credential.role === "admin" || credential.role === "content_manager"));
      if (!allowed || !credential) {
        recordLoginFailure(key);
        await recordLoginResult({ email, success: false });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }
      loginAttempts.delete(key);
      await recordLoginResult({ userId: credential.userId, email, success: true });
      const token = await createCmsSessionToken({ userId: credential.userId, sessionVersion: credential.sessionVersion }, input.rememberMe);
      setCmsSessionCookie(ctx, token, input.rememberMe);
      return { success: true, token, rememberMe: input.rememberMe } as const;
    }),
    register: publicProcedure.input(z.object({
      email: emailInput,
      code: verificationCodeInput,
      name: z.string().trim().min(2).max(200),
      password: passwordInput,
    })).mutation(async ({ input, ctx }) => {
      try {
        if (!isStrongPassword(input.password)) throw new Error("PASSWORD_TOO_WEAK");
        const user = await acceptInvitation({ email: input.email, code: input.code, name: input.name, passwordHash: await hashPassword(input.password) });
        const token = await createCmsSessionToken({ userId: user.id, sessionVersion: user.sessionVersion }, false);
        setCmsSessionCookie(ctx, token, false);
        return { success: true } as const;
      } catch (error) {
        if (error instanceof Error && error.message === "PASSWORD_TOO_WEAK") {
          throw new TRPCError({ code: "BAD_REQUEST", message: CMS_PASSWORD_REQUIREMENT });
        }
        throw new TRPCError({ code: "BAD_REQUEST", message: "We couldn't verify that code. Request a new code and use only the most recent email; codes expire after 10 minutes." });
      }
    }),
    forgotPassword: publicProcedure.input(z.object({ email: emailInput })).mutation(async ({ input }) => {
      try {
        const reset = await createPasswordReset(input.email);
        if (reset) {
          try {
            const delivery = await sendPasswordResetEmail({
              to: reset.email,
              code: reset.code,
            });
            console.info("[CMS Auth] Password reset email accepted by provider", { messageId: delivery?.id ?? "unknown" });
          } catch (error) {
            console.error("[CMS Auth] Password reset email could not be sent", error);
          }
        } else {
          const setup = await createPrimaryAdminSetup(input.email);
          if (setup) {
            try {
              const delivery = await sendPrimaryAdminSetupEmail({
                to: setup.email,
                code: setup.code,
              });
              console.info("[CMS Auth] Primary administrator setup email accepted by provider", { messageId: delivery?.id ?? "unknown" });
            } catch (error) {
              console.error("[CMS Auth] Primary administrator setup email could not be sent", error);
            }
          }
        }
      } catch (error) {
        if (!(error instanceof Error && error.message === "CODE_RESEND_COOLDOWN")) {
          console.error("[CMS Auth] Verification code request could not be completed", error);
        }
      }
      return { success: true, message: "If an eligible account matches that email, a six-digit verification code has been sent." } as const;
    }),
    resetPassword: publicProcedure.input(z.object({ email: emailInput, code: verificationCodeInput, password: passwordInput })).mutation(async ({ input, ctx }) => {
      try {
        if (!isStrongPassword(input.password)) throw new Error("PASSWORD_TOO_WEAK");
        const passwordHash = await hashPassword(input.password);
        const credential = await getCredentialByEmail(input.email);
        if (credential?.isPrimaryAdmin && !credential.deletedAt && (credential.status !== "active" || !credential.passwordHash)) {
          await acceptInvitation({
            email: input.email,
            code: input.code,
            name: credential.name?.trim() || "Primary Administrator",
            passwordHash,
          });
        } else {
          await completePasswordReset({ email: input.email, code: input.code, passwordHash });
        }
        ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
        return { success: true } as const;
      } catch (error) {
        if (error instanceof Error && error.message === "PASSWORD_TOO_WEAK") {
          throw new TRPCError({ code: "BAD_REQUEST", message: CMS_PASSWORD_REQUIREMENT });
        }
        throw new TRPCError({ code: "BAD_REQUEST", message: "We couldn't verify that code. Request a new code and use only the most recent email; codes expire after 10 minutes." });
      }
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      if (ctx.user) {
        try {
          await revokeCmsUserSessions(ctx.user.id);
        } catch (error) {
          console.error("[CMS Auth] Could not revoke the signed-out session version", error);
        }
      }
      return {
        success: true,
      } as const;
    }),
  }),
  cmsUsers: router({
    list: accountAdminProcedure.query(() => listCmsUsersAndInvitations()),
    invite: accountAdminProcedure.input(z.object({ email: emailInput, role: cmsRole })).mutation(async ({ input, ctx }) => {
      try {
        const invitation = await createInvitation({ email: input.email, role: input.role, actorUserId: ctx.user.id });
        await sendInvitationEmail({
          to: invitation.email,
          role: invitation.role,
          code: invitation.code,
        });
        return { success: true } as const;
      } catch (error) {
        accountError(error);
      }
    }),
    resendInvitation: accountAdminProcedure.input(z.object({ invitationId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const data = await listCmsUsersAndInvitations();
      const previous = data.invitations.find(item => item.id === input.invitationId);
      if (!previous) throw new TRPCError({ code: "NOT_FOUND", message: "The invitation is no longer available." });
      try {
        const invitation = await createInvitation({ email: previous.email, role: previous.role as "admin" | "content_manager", actorUserId: ctx.user.id });
        await sendInvitationEmail({
          to: invitation.email,
          role: invitation.role,
          code: invitation.code,
        });
        return { success: true } as const;
      } catch (error) {
        accountError(error);
      }
    }),
    revokeInvitation: accountAdminProcedure.input(z.object({ invitationId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      try {
        await revokeInvitation({ invitationId: input.invitationId, actorUserId: ctx.user.id });
        return { success: true } as const;
      } catch (error) {
        accountError(error);
      }
    }),
    changeRole: accountAdminProcedure.input(z.object({ userId: z.number().int().positive(), role: cmsRole })).mutation(async ({ input, ctx }) => {
      try {
        await changeCmsUserRole({ targetUserId: input.userId, role: input.role, actorUserId: ctx.user.id });
        return { success: true } as const;
      } catch (error) {
        accountError(error);
      }
    }),
    remove: accountAdminProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove your own account." });
      try {
        await removeCmsUser({ targetUserId: input.userId, actorUserId: ctx.user.id });
        return { success: true } as const;
      } catch (error) {
        accountError(error);
      }
    }),
  }),
  inquiry: router({
    submit: publicProcedure.input(inquiryInput).mutation(async ({ input }) => {
      if (input.website) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid submission" });
      const since = new Date(Date.now() - 10 * 60 * 1000);
      const recentCount = await countRecentInquiriesByEmail(input.email, since);
      if (recentCount >= 3) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait a few minutes before sending another request." });

      const phone = normalizeUsPhone(input.phone);
      const inquiryId = await createInquiry({
        inquiryType: input.inquiryType,
        name: input.name,
        email: input.email,
        phone,
        serviceType: input.serviceType,
        message: input.message,
        sourcePath: input.sourcePath || "/contact/",
        status: "new",
        notificationStatus: "pending",
      });

      let notificationSent = false;
      try {
        const delivery = await sendInquiryNotification({
          inquiryId,
          inquiryType: input.inquiryType,
          name: input.name,
          email: input.email,
          phone: displayUsPhone(phone),
          serviceType: input.serviceType,
          message: input.message,
          sourcePath: input.sourcePath || "/contact/",
        });
        notificationSent = Boolean(delivery?.id);
      } catch (error) {
        console.error(`[Inquiry] Resend notification failed for ${inquiryId}`, error);
      }

      try {
        await updateInquiryNotificationStatus(inquiryId, notificationSent ? "sent" : "failed");
      } catch (error) {
        console.error(`[Inquiry] Could not update notification status for ${inquiryId}`, error);
      }
      return { success: true, inquiryId, notificationSent } as const;
    }),
    list: adminProcedure.query(() => listInquiries()),
    detail: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const record = await getInquiryById(input.id);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found." });
      return record;
    }),
    updateStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "contacted", "closed"]) })).mutation(async ({ input }) => {
      await updateInquiryStatus(input.id, input.status);
      return { success: true } as const;
    }),
    reply: adminProcedure.input(z.object({ id: z.number().int().positive(), subject: z.string().trim().min(3).max(320), message: z.string().trim().min(10).max(10000) })).mutation(async ({ input, ctx }) => {
      const record = await getInquiryById(input.id);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found." });
      const responseId = await createInquiryResponse({
        inquiryId: input.id,
        senderUserId: ctx.user.id,
        senderName: ctx.user.name?.trim() || "NYC Cleaning Team",
        senderEmail: ctx.user.email?.trim().toLowerCase() || "info@nyccleaning.co",
        recipientEmail: record.inquiry.email,
        subject: input.subject,
        message: input.message,
        deliveryStatus: "pending",
      });
      try {
        const delivery = await sendInquiryReply({ to: record.inquiry.email, customerName: record.inquiry.name, subject: input.subject, message: input.message });
        await updateInquiryResponseDelivery({ id: responseId, deliveryStatus: "sent", providerMessageId: delivery?.id ?? null });
        await markInquiryResponded(input.id);
        return { success: true, responseId } as const;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message.slice(0, 1000) : "Email delivery failed";
        await updateInquiryResponseDelivery({ id: responseId, deliveryStatus: "failed", errorMessage });
        console.error(`[Inquiry] CMS reply failed for inquiry ${input.id}`, error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The reply could not be sent. Your message was saved; please try again." });
      }
    }),
  }),
  article: router({
    listPublished: publicProcedure.query(() => listPublishedArticles()),
    byPath: publicProcedure.input(z.object({ path: normalizedArticlePath })).query(({ input }) =>
      getPublishedArticleByPath(input.path),
    ),
    adminList: adminProcedure.query(() => listAllArticles()),
    create: adminProcedure.input(articleInput).mutation(async ({ input, ctx }) => {
      const id = await createArticle({
        ...input,
        description: input.excerpt,
        blocks: input.body,
        sourceUrl: input.sourceUrl || null,
        publishedAt: input.status === "published" ? input.publishedAt || new Date() : input.publishedAt || null,
        createdByOpenId: ctx.user.openId,
      });
      return { success: true, id } as const;
    }),
    update: adminProcedure.input(articleInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const { id, ...article } = input;
      await updateArticle(id, {
        ...article,
        description: article.excerpt,
        blocks: article.body,
        sourceUrl: article.sourceUrl || null,
        publishedAt: article.status === "published" ? article.publishedAt || new Date() : article.publishedAt || null,
      });
      return { success: true } as const;
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      await deleteArticle(input.id);
      return { success: true } as const;
    }),
    uploadCover: adminProcedure.input(z.object({
      fileName: z.string().trim().min(1).max(255),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
      base64: z.string().min(16).max(12_000_000),
    })).mutation(async ({ input, ctx }) => {
      const bytes = Buffer.from(input.base64, "base64");
      if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cover image must be 8 MB or smaller." });
      }
      const extension = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/avif": "avif",
      }[input.mimeType];
      const fileStem = input.fileName
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "article-cover";
      const result = await storagePut(
        `article-covers/${ctx.user.openId}/${fileStem}.${extension}`,
        bytes,
        input.mimeType,
      );
      return result;
    }),
    generateCover: adminProcedure.input(z.object({
      prompt: z.string().trim().min(10).max(1200),
      title: z.string().trim().max(512).optional(),
      excerpt: z.string().trim().max(1200).optional(),
    })).mutation(async ({ input }) => {
      const context = [
        input.title ? `Article title: ${input.title}.` : "",
        input.excerpt ? `Article summary: ${input.excerpt}.` : "",
      ].filter(Boolean).join(" ");
      const prompt = [
        "Create a realistic, premium editorial cover photograph for NYC Cleaning and Maintenance, a professional New York City property cleaning company.",
        context,
        `Creative direction: ${input.prompt}`,
        "Use believable New York property details, clean natural lighting, navy and subtle teal visual accents, and a polished commercial photography style.",
        "Do not include text, logos, watermarks, distorted architecture, unsafe cleaning practices, or exaggerated before-and-after effects.",
        "Compose the image as a horizontal 3:2 website cover with a clear focal point and enough visual breathing room for responsive cropping.",
      ].filter(Boolean).join(" ");

      try {
        const result = await generateImage({ prompt });
        if (!result.url) throw new Error("The image service returned no image URL.");
        return { url: result.url, key: result.key ?? null } as const;
      } catch (error) {
        console.error("[Article] AI cover generation failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "The image could not be generated. Please adjust the prompt and try again.",
        });
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
