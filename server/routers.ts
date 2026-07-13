import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { countRecentInquiriesByEmail, createInquiry, updateInquiryNotificationStatus } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

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

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
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
});

export type AppRouter = typeof appRouter;
