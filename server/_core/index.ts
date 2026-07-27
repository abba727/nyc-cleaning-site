import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { TRPCError } from "@trpc/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter, submitPublicInquiry } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import { registerSeoRoutes } from "../seoRoutes";
import { getSiteSettings, listPublishedArticles } from "../db";
import { toPublicMediaUrl } from "../storage";

const GA4_MEASUREMENT_ID = /^G-[A-Z0-9-]+$/;
const GTM_CONTAINER_ID = /^GTM-[A-Z0-9-]+$/;

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerSeoRoutes(app);
  app.get("/api/tracking-config", async (_req, res) => {
    try {
      const settings = await getSiteSettings();
      const measurementId = settings.googleAnalyticsMeasurementId?.trim().toUpperCase() || "";
      const containerId = settings.googleTagManagerContainerId?.trim().toUpperCase() || "";
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      res.status(200).json({
        googleAnalyticsMeasurementId: GA4_MEASUREMENT_ID.test(measurementId) ? measurementId : null,
        googleTagManagerContainerId: GTM_CONTAINER_ID.test(containerId) ? containerId : null,
      });
    } catch (error) {
      console.error("[Tracking] Public tracking configuration could not be loaded", error);
      res.status(204).end();
    }
  });
  app.get("/api/homepage-insights", async (_req, res) => {
    try {
      const insights = await listPublishedArticles(3);
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      res.status(200).json({
        insights: insights.map(insight => ({
          ...insight,
          coverImageUrl: insight.coverImageUrl ? toPublicMediaUrl(insight.coverImageUrl) : null,
        })),
      });
    } catch (error) {
      console.error("[Insights] Public homepage cards could not be loaded", error);
      res.status(204).end();
    }
  });
  app.post("/api/inquiry", async (req, res) => {
    try {
      const result = await submitPublicInquiry(req.body);
      res.status(201).json(result);
    } catch (error) {
      const isPublicError = error instanceof TRPCError;
      const code = isPublicError ? error.code : "BAD_REQUEST";
      const status = code === "TOO_MANY_REQUESTS" ? 429 : code === "BAD_REQUEST" ? 400 : 500;
      const message = isPublicError && code !== "INTERNAL_SERVER_ERROR"
        ? error.message
        : code === "BAD_REQUEST"
          ? "Please check the required fields and try again."
          : "We couldn’t send your request right now. Please try again shortly.";
      res.status(status).json({ error: code, message });
    }
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Development mode is explicitly opt-in; all other environments use the
  // pre-built production server so Cloud Run never resolves Vite at startup.
  if (process.env.NODE_ENV === "development") {
    // Keep the development server outside the production bundle. In source
    // mode this resolves to server/_core/vite.ts; production never evaluates it.
    const developmentEntrypoint = "./vite";
    const { setupVite } = await import(developmentEntrypoint);
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const port = process.env.NODE_ENV === "development"
    ? await findAvailablePort(preferredPort)
    : preferredPort;

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
