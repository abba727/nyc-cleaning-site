import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { countRecentInquiriesByEmail, createArticle, createInquiry, deleteArticle, getPublishedArticleByPath, listAllArticles, listPublishedArticles, updateArticle, updateInquiryNotificationStatus } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { ENV } from "./_core/env";

const inquiryInput = z.object({
  inquiryType: z.enum(["contact", "quote"]).default("quote"),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().email().max(320),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(48)
    .refine(value => value.replace(/\D/g, "").length >= 7, "Enter a valid phone number"),
  serviceType: z.string().trim().min(2).max(160),
  message: z.string().trim().min(10).max(5000),
  sourcePath: z.string().trim().max(512).default("/contact/"),
  website: z.string().max(0).optional(),
});

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

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user || opts.ctx.user.openId !== ENV.ownerOpenId) return opts.ctx.user;
      return { ...opts.ctx.user, role: "admin" as const };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  inquiry: router({
    submit: publicProcedure.input(inquiryInput).mutation(async ({ input }) => {
      if (input.website) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid submission" });

      const since = new Date(Date.now() - 10 * 60 * 1000);
      const recentCount = await countRecentInquiriesByEmail(input.email, since);
      if (recentCount >= 3) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Please wait a few minutes before sending another request.",
        });
      }

      const inquiryId = await createInquiry({
        inquiryType: input.inquiryType,
        name: input.name,
        email: input.email,
        phone: input.phone,
        serviceType: input.serviceType,
        message: input.message,
        sourcePath: input.sourcePath || "/contact/",
        status: "new",
        notificationStatus: "pending",
      });

      const notificationSent = await notifyOwner({
        title: `New ${input.inquiryType === "quote" ? "quote request" : "contact inquiry"}: ${input.name}`,
        content: [
          `Inquiry #${inquiryId}`,
          `Name: ${input.name}`,
          `Email: ${input.email}`,
          `Phone: ${input.phone}`,
          `Service interest: ${input.serviceType}`,
          `Source page: ${input.sourcePath || "/contact/"}`,
          `Message: ${input.message}`,
        ].join("\n"),
      });

      try {
        await updateInquiryNotificationStatus(inquiryId, notificationSent ? "sent" : "failed");
      } catch (error) {
        console.error(`[Inquiry] Could not update notification status for ${inquiryId}`, error);
      }

      return { success: true, inquiryId, notificationSent } as const;
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
  }),
});

export type AppRouter = typeof appRouter;
